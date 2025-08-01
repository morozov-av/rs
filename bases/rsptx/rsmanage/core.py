#
# rsmanage -- utility commands to help manage a Runestone Server
#
#
# There is no real reason for this command line utility to be async, but
# because all of our database access functions are written for use with
# async database access we do it anyway so we can get better code reuse.
# Thankfully Asyncclick is a wrapper around
# click that allows you to declare your subcommand functions async.
#

# Standard library imports

import asyncclick as click
import csv
import datetime
from datetime import timezone
import json
import os
import re
import sys
import subprocess

# third party imports
import redis
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from psycopg2.errors import UniqueViolation
import psycopg2
from psycopg2.sql import Identifier, SQL


# our own package imports

from rsptx.db.crud import (
    copy_course_attributes,
    create_initial_courses_users,
    create_book_author,
    create_course,
    create_course_attribute,
    create_domain_approval,
    create_editor_for_basecourse,
    create_instructor_course_entry,
    create_library_book,
    create_user_course_entry,
    delete_user,
    fetch_all_course_attributes,
    fetch_assignments,
    fetch_course,
    fetch_courses_for_user,
    fetch_course_instructors,
    fetch_group,
    fetch_instructor_courses,
    fetch_library_book,
    fetch_users_for_course,
    fetch_membership,
    fetch_user,
    create_user,
    create_group,
    create_membership,
    is_author,
    is_editor,
    update_user,
    update_library_book,
)
from rsptx.db.models import CoursesValidator, AuthUserValidator, DomainApprovals
from rsptx.db.async_session import init_models, term_models
from rsptx.configuration import settings
from rsptx.build_tools.core import _build_runestone_book, _build_ptx_book
from rsptx.cl_utils.core import load_project_dotenv
from rsptx.data_extract import Anonymizer
from rsptx.response_helpers.core import canonical_utcnow


class Config(object):
    def __init__(self):
        self.verbose = False


pass_config = click.make_pass_decorator(Config, ensure=True)

# configuration
REQ_ENV = [
    "SERVER_CONFIG",
    "DBURL",
    "WEB2PY_PRIVATE_KEY",
    "JWT_SECRET",
    "BOOK_PATH",
    "FERNET_SECRET",
]
OPT_ENV = [
    "DC_DEV_DBURL",
    "DC_DBURL",
    "LTI1P3_PRIVATE_KEY",
    "LTI1P3_PUBLIC_KEY",
]
APP = "runestone"
APP_PATH = f"applications/{APP}"
DBSDIR = f"{APP_PATH}/databases"
BUILDDIR = f"{APP_PATH}/build"
PRIVATEDIR = f"{APP_PATH}/private"


@click.group()
@click.option("--verbose", is_flag=True, help="More verbose output")
@click.option("--if_clean", is_flag=True, help="only run if database is uninitialized")
@pass_config
async def cli(config, verbose, if_clean):
    """Type subcommand --help for help on any subcommand"""

    checkEnvironment()

    conf = settings.server_config
    config.dburl = settings.database_url

    # DAL uses "postgres:", while SQLAlchemy (and the PostgreSQL spec) uses "postgresql:". Fix.
    remove_prefix = "postgres://"
    if config.dburl.startswith(remove_prefix):
        config.dburl = f"postgresql://{config.dburl[len(remove_prefix):]}"

    config.conf = conf
    config.dbname = re.match(r"postgres.*//.*?@.*?/(.*)", config.dburl).group(1)
    config.dbhost = re.match(r"postgres.*//.*?@(.*?)/(.*)", config.dburl).group(1)

    click.echo(f"Using configuration: {conf}")
    click.echo(f"Using database: {config.dbname}")

    if conf != "production":
        config.dbuser = re.match(
            r"postgres.*//(.*?)(:.*?)?@(.*?)/(.*)", config.dburl
        ).group(1)
    else:
        config.dbuser = re.match(
            r"postgres.*//(.*?):(.*?)@(.*?)/(.*)", config.dburl
        ).group(1)

    config.dbpass = os.environ.get("POSTGRES_PASSWORD")
    if verbose:
        echoEnviron(config)

    check_db_connection(config)
    if if_clean:
        count = check_db_for_useinfo(config)
        if count != 0:
            click.echo("The database is already inititlized Exiting")
            sys.exit()

    config.verbose = verbose


def check_db_connection(config):
    # check to see if we can connect to the database
    # if not then we need to exit
    click.echo("Checking database connection")
    try:
        engine = create_engine(config.dburl.replace("+asyncpg", ""))
        click.echo(config.dburl)
        engine.connect()
        engine.dispose()
        click.echo("Database connection successful")
    except Exception:
        click.echo(f"Failed to connect to the database {config.dbname}")
        if config.dbname not in ["runestone", "runestone_dev", "runestone_test"]:
            click.echo(
                "Normally the database name should be runestone or runestone_dev"
            )
        click.echo(f"    You are trying to connect to host: {config.dbhost}")
        if os.environ.get("DOCKER_COMPOSE", False):
            if config.dbhost == "localhost":
                click.echo(
                    "you almost certainly don't want localhost as the host in docker"
                )
                click.echo(
                    "The most common host names in docker are db, pgbouncer, or host.docker.internal"
                )
            else:
                click.echo(
                    "The most common host names in docker are db, pgbouncer, or host.docker.internal"
                )
            click.echo("    Are you sure you have the right host name?")
        click.echo(f"    with user: {config.dbuser}")
        if config.dbuser != "runestone":
            click.echo("Normally the username should be runestone")
        if config.conf == "development":
            click.echo(f"    and password: {config.dbpass}")
            click.echo("Check your .env file for DEV_DBURL and DC_DEV_DBURL")
        else:
            click.echo("Check your .env file for DBURL and DC_DBURL")

        sys.exit(1)


async def _initdb(config):
    # Because click won't natively support making commands async we can use this simple method
    # to call async functions.
    # Since we successfully dropped the database we need to initialize it here.

    await init_models()
    await create_initial_courses_users()
    await create_group("instructor")
    await create_group("editor")
    await create_group("author")
    await term_models()  # dispose of the engine


#
#    initdb
#
@cli.command()
@click.option(
    "--list_tables", is_flag=True, help="List all of the defined tables when done"
)
@click.option(
    "--reset", is_flag=True, help="drop database and delete all migration information"
)
@click.option("--force", is_flag=True, help="answer Yes to confirm questions")
@pass_config
async def initdb(config, list_tables, reset, force):
    """Initialize and optionally reset the database"""
    checkEnvironment()
    if reset:
        if not force:
            click.confirm(
                "Resetting the database will delete the database and the contents of the databases folder.  Are you sure?",
                default=False,
                abort=True,
                prompt_suffix=": ",
                show_default=True,
                err=False,
            )

        conn = psycopg2.connect(
            database="template1",
            user=config.dbuser,
            password=config.dbpass,
            host=config.dbhost,
        )
        conn.set_session(autocommit=True)
        curs = conn.cursor()
        curs.execute(SQL("DROP DATABASE {}").format(Identifier(config.dbname)))
        curs.execute(
            SQL("CREATE DATABASE {} WITH OWNER = {}").format(
                Identifier(config.dbname), Identifier(config.dbuser)
            )
        )
        curs.close()
        conn.close()

        # Because click won't natively support making commands async we can use this simple method
        # to call async functions.
        # Since we successfully dropped the database we need to initialize it here.
        settings.drop_tables = "Yes"
        await _initdb(config)
        click.echo("Created new tables")

    click.echo(
        message="Initializing the database", file=None, nl=True, err=False, color=None
    )

    if not reset:
        await _initdb(config)


#
#    addcourse
#


@cli.command()
@click.option("--course-name", help="The name of a course to create")
@click.option("--basecourse", help="The name of the basecourse")
@click.option(
    "--start-date", default="2001-01-01", help="Start Date for the course in YYYY-MM-DD"
)
@click.option("--python3/--no-python3", default=True, help="Use python3 style syntax")
@click.option(
    "--login-required/--no-login-required",
    help="Only registered users can access this course?",
)
@click.option("--institution", help="Your institution")
@click.option("--courselevel", help="Your course level", default="unknown")
@click.option("--allowdownloads", help="enable download button", default="F")
@click.option("--language", default="python", help="Default Language for your course")
@click.option("--host", default="runestone.academy", help="runestone server host name")
@click.option(
    "--newserver/--no-newserver", default=True, help="use the new book server"
)
@click.option(
    "--allow_pairs/--no-allow-pairs",
    default=False,
    help="enable experimental pair programming support",
)
@pass_config
async def addcourse(
    config,
    course_name,
    basecourse,
    start_date,
    python3,
    login_required,
    institution,
    courselevel,
    allowdownloads,
    language,
    host,
    newserver,
    allow_pairs,
):
    """Create a course in the database"""

    if not basecourse:
        basecourse = click.prompt("Base Course: ")
    bookrec = await fetch_library_book(basecourse)
    if bookrec.build_system is None:
        click.echo(f"{basecourse} Not Found: Build the corresponding base course first!")
        exit(1)
    done = False
    regex = r"^([\x30-\x39]|[\x41-\x5A]|[\x61-\x7A]|[_-])*$"
    if course_name:
        use_defaults = True
    else:
        use_defaults = False
    while not done:
        if not course_name:
            course_name = click.prompt("Course Name")
        if not re.match(regex, course_name):
            click.echo("Course name must be alphanumeric or underscore")
            course_name = None
            continue
        if not python3 and not use_defaults:
            python3 = (
                "T" if click.confirm("Use Python3 style syntax?", default="T") else "F"
            )
        else:
            python3 = "T" if python3 else "F"
        if not basecourse and not use_defaults:
            basecourse = click.prompt("Base Course")
        if not start_date and not use_defaults:
            start_date = click.prompt("Start Date YYYY-MM-DD")
        if not institution and not use_defaults:
            institution = click.prompt("Your institution")
        # TODO: these prompts make no sense -- only ask for them if the option was False??? Looks like a copy-and-paste error.
        if not login_required and not use_defaults:
            login_required = (
                "T" if click.confirm("Require users to log in", default="T") else "F"
            )
        else:
            login_required = "T" if login_required else "F"
        if not allow_pairs and not use_defaults:
            allow_pairs = (
                "T"
                if click.confirm("Enable pair programming support", default=False)
                else "F"
            )
        else:
            allow_pairs = "T" if allow_pairs else "F"

        res = await fetch_course(course_name)
        if not res:
            done = True
        else:
            click.confirm(
                f"Course {course_name} already exists continue with a different name?",
                default=True,
                abort=True,
            )

    newCourse = CoursesValidator(
        course_name=course_name,
        base_course=basecourse,
        python3=python3,
        term_start_date=start_date,
        login_required=login_required,
        institution=institution,
        courselevel=courselevel,
        downloads_enabled=allowdownloads,
        allow_pairs=allow_pairs,
        new_server="T",
    )
    newCourse = await create_course(newCourse)
    click.echo("Course added to DB successfully")
    bc = await fetch_course(basecourse)
    if bc.id != newCourse.id:
        await copy_course_attributes(bc.id, newCourse.id)


#
#    build
#


@cli.command()
@click.option("--clone", default=None, help="clone the given repo before building")
@click.option("--ptx", is_flag=True, help="Build a PreTeXt book")
@click.option(
    "--gen", is_flag=True, help="Build PreTeXt generated assets (a one time thing)"
)
@click.option("--manifest", default="runestone-manifest.xml", help="Manifest file")
@click.argument("course", nargs=1)
@pass_config
async def build(config, clone, ptx, gen, manifest, course):
    """
    rsmanage build [options] COURSE
    Build the book for an existing course
    """
    res = await fetch_course(course)
    if not res:
        click.echo(
            click.style(
                f"Error:  The course {course} must already exist in the database -- use rsmanage addcourse",
                fg="red",
            ),
        )
        exit(1)

    os.chdir(settings.book_path)
    if clone:
        if os.path.exists(course):
            click.echo("Book repo already cloned, skipping")
        else:
            # check to make sure repo name and course name match
            res = subprocess.call(f"git clone {clone}", shell=True)
            if res != 0:
                click.echo(
                    "Cloning the repository failed, please check the URL and try again"
                )
                exit(1)

    # proj_dir = os.path.basename(repo).replace(".git", "")
    click.echo(f"Switching to book dir {course}")
    os.chdir(course)
    if ptx:
        res = _build_ptx_book(config, gen, manifest, course)

    else:
        res = _build_runestone_book(config, course)

    if res:
        click.echo("Build Succeeded")
    else:
        click.echo("Build Failed, see author_build.log for details")


#
#    adduser
#
@cli.command()
@click.option(
    "--fromfile",
    default=None,
    type=click.File(mode="r"),
    help="read a csv file of users of the form username, email, first_name, last_name, password, course",
)
@click.option("--username", help="Username, must be unique")
@click.option("--password", help="password - plaintext -- sorry")
@click.option("--first_name", help="Real first name")
@click.option("--last_name", help="Real last name")
@click.option("--email", help="email address for password resets")
@click.option("--course", help="course to register for")
@click.option(
    "--ignore_dupes",
    is_flag=True,
    help="ignore duplicate student errors and keep processing",
)
@pass_config
async def adduser(
    config,
    fromfile,
    username,
    password,
    first_name,
    last_name,
    email,
    course,
    ignore_dupes,
):
    """Add a user (or users from a csv file)"""

    mess = [
        "Success",
        "Value Error -- check the format of your CSV file",
        "Duplicate User -- Check your data or use --ignore_dupes if you are adding students to an existing CSV",
        "Unknown Error -- check the format of your CSV file",
    ]
    if fromfile:
        # if fromfile then be sure to get the full path name NOW.
        # csv file should be username, email first_name, last_name, password, course
        # users from a csv cannot be instructors
        course = None
        for line in csv.reader(fromfile):
            if len(line) != 6:
                click.echo("Not enough data to create a user.  Lines must be")
                click.echo("username, email, first_name, last_name, password, course")
                exit(1)
            if "@" not in line[1]:
                click.echo("emails should have an @ in them in column 2")
                exit(1)
            if course is None:
                course = await fetch_course(line[5])
            newUser = AuthUserValidator(
                username=line[0],
                password=line[4],
                first_name=line[2],
                last_name=line[3],
                email=line[1],
                course_name=line[5],
                instructor=False,
                created_on=canonical_utcnow(),
                modified_on=canonical_utcnow(),
                registration_key="",
                registration_id="",
                reset_password_key="",
                course_id=course.id,
                active=True,
                donated=False,
                accept_tcp=True,
            )
            res = await create_user(newUser)
            if not res:
                click.echo(f"Failed to create user {line[0]} error {mess[res]}")
                exit(1)
            else:
                exit(0)

    else:
        userinfo = {}
        userinfo["username"] = username or click.prompt("Username")
        userinfo["password"] = password or click.prompt("Password", hide_input=True)
        userinfo["first_name"] = first_name or click.prompt("First Name")
        userinfo["last_name"] = last_name or click.prompt("Last Name")
        userinfo["email"] = email or click.prompt("email address")
        userinfo["course_name"] = course or click.prompt(
            "course name (blank for none)", default="boguscourse", show_default=False
        )
        course = await fetch_course(userinfo["course_name"])
        new_user = AuthUserValidator(
            **userinfo,
            created_on=canonical_utcnow(),
            modified_on=canonical_utcnow(),
            registration_key="",
            registration_id="",
            reset_password_key="",
            course_id=course.id,
            active=True,
            donated=False,
            accept_tcp=True,
        )
        res = await create_user(new_user)
        if not res:
            click.echo(
                f"Failed to create user {userinfo['username']} error {res} fix your data and try again. Use --verbose for more detail"
            )
            exit(1)
        else:
            if userinfo["course_name"] == "boguscourse":
                click.echo(
                    click.style(
                        "Warning:  You created a user that is not enrolled in a course. ",
                        fg="yellow",
                    )
                )
            click.echo("Success")


@cli.command()
@click.option("--username", help="Username, must be unique")
@click.option("--password", help="password - plaintext -- sorry")
@pass_config
async def resetpw(config, username, password):
    """Utility to change a users password. Useful If they can't do it through the normal mechanism"""
    userinfo = {}
    username = username or click.prompt("Username")
    userinfo["password"] = password or click.prompt("Password", hide_input=True)

    res = await fetch_user(username)
    if not res:
        click.echo(f"ERROR - User: {userinfo['username']} does not exist.")
        exit(1)
    res = await update_user(res.id, userinfo)

    click.echo("Success")


@cli.command()
@click.option("--username", help="Username, must be unique")
@pass_config
async def rmuser(config, username):
    """Utility to remove a user from the system completely."""

    sid = username or click.prompt("Username")
    await delete_user(sid)


@cli.command()
@click.option("--checkdb", is_flag=True, help="check state of db and databases folder")
@pass_config
def env(config, checkdb):
    """Print out your configured environment
    If --checkdb is used then env will exit with one of the following exit codes
        0: no database, no database folder
        1: no database but databases folder
        2: database exists but no databases folder
        3: both database and databases folder exist
    """
    dbinit = 0
    dbdir = 0
    if checkdb:
        count = check_db_for_useinfo(config)
        if count == 0:
            dbinit = 0
            print("Database not initialized")
        else:
            dbinit = 2
            print("Database is initialized")

        if os.path.exists(DBSDIR):
            dbdir = 1
            print("Database migration folder exists")
        else:
            dbdir = 0
            print("No Database Migration Folder")

    if not checkdb or config.verbose:
        echoEnviron(config)

    print(f"Exiting with result of {dbinit | dbdir}")

    sys.exit(dbinit | dbdir)


@cli.command()
@click.option("--username", default=None, help="user to promote to instructor")
@click.option("--course", default=None, help="name of course")
@pass_config
async def addinstructor(config, username, course):
    """
    Add an existing user as an instructor for a course
    """

    username = username or click.prompt("Username")
    course = course or click.prompt("Course name")

    res = await fetch_user(username)
    if res:
        userid = res.id
    else:
        print("Sorry, that user does not exist")
        sys.exit(-1)

    res = await fetch_course(course)
    if res:
        courseid = res.id
    else:
        print("Sorry, that course does not exist")
        sys.exit(-1)

    # if needed insert a row into auth_membership
    res = await fetch_group("instructor")
    if res:
        role = res.id
    else:
        print(
            "Sorry, your system does not have the instructor role setup -- this is bad"
        )
        sys.exit(-1)

    res = await fetch_membership(role, userid)
    if not res:
        await create_membership(role, userid)
        print(f"made {username} an instructor")
    else:
        print(f"{username} is already an instructor")

    # if needed insert a row into user_courses
    res = await fetch_courses_for_user(userid)
    needs_enrollment = True
    for row in res:
        if row.course_name == course:
            print(f"{username} is already enrolled in {course}")
            needs_enrollment = False
    if needs_enrollment:
        await create_user_course_entry(userid, courseid)
        print(f"enrolled {username} in {course}")

    # if needed insert a row into course_instructor
    res = await fetch_instructor_courses(userid, courseid)

    if not res:
        await create_instructor_course_entry(userid, courseid)
        print(f"made {username} an instructor for {course}")
    else:
        print(f"{username} is already an instructor for {course}")


@cli.command()
@click.option("--username", help="user to promote to instructor")
@click.option("--basecourse", help="name of base course")
@pass_config
async def addeditor(config, username, basecourse):
    """
    Add an existing user as an editor for a given base course
    """

    res = await fetch_user(username)
    if res:
        userid = res.id
    else:
        click.echo(click.style("Sorry, that user does not exist", fg="red"))
        sys.exit(-1)

    res = await fetch_course(basecourse)
    if not res:
        click.echo(click.style("Sorry, that base course does not exist", fg="red"))
        sys.exit(-1)

    # if needed insert a row into auth_membership
    res = await fetch_group("editor")
    if res:
        role = res.id
    else:
        click.echo(
            click.style(
                "Sorry, your system does not have the editor role setup -- this is bad",
                fg="red",
            ),
        )
        sys.exit(-1)

    if not is_editor(userid):
        await create_membership(role, userid)
        click.echo(click.style(f"made {username} an editor", fg="green"))
    else:
        click.echo(click.style(f"{username} is already an editor", fg="red"))

    try:
        await create_editor_for_basecourse(userid, basecourse)
    except Exception:
        click.echo(
            click.style(
                f"could not add {username} as editor - They probably already are",
                fg="red",
            )
        )
        sys.exit(-1)

    click.echo(click.style(f"made {username} an editor for {basecourse}", fg="green"))


@cli.command()
@click.option("--name", help="Name of the course")
@pass_config
async def courseinfo(config, name):
    """
    List all information for a single course

    """

    if not name:
        name = click.prompt("What course do you want info about?")

    course = await fetch_course(name)
    if not course:
        click.echo(f"Sorry, the course {name} does not exist")
        sys.exit(-1)
    cid = course.id
    start_date = course.term_start_date
    inst = course.institution
    bc = course.base_course

    student_list = await fetch_users_for_course(name)
    s_count = len(student_list)
    res = await fetch_course_instructors(name)

    print(f"Course Information for {name} -- ({cid})")
    print(inst)
    print(f"Base course: {bc}")
    print(f"Start date: {start_date}")
    print(f"Number of students: {s_count}")
    print("Instructors:")
    for row in res:
        print(" ", row.first_name, row.last_name, row.username, row.email)


@cli.command()
@click.option("--student", default=None, help="Name of the student")
@pass_config
async def studentinfo(config, student):
    """
    display PII and all courses enrolled for a username
    """

    if not student:
        student = click.prompt("Student Id: ")

    student = await fetch_user(student)
    courses = await fetch_courses_for_user(student.id)

    print("id\tFirst\tLast\temail")
    print(f"{student.id}\t{student.first_name}\t{student.last_name}\t{student.email}")
    print("")
    print("         Course        cid")
    print("--------------------------")

    if courses:
        for row in courses:
            print(f"{row.course_name.rjust(15)} {str(row.id).rjust(10)}")


@cli.command()
@click.option("--course", default=None, help="Name of the course")
@click.option("--attr", default=None, help="Attribute to add")
@click.option("--value", default=None, help="Attribute Value")
@pass_config
async def addattribute(config, course, attr, value):
    """
    Add an attribute to the `course_attributes` table

    """
    course = course or click.prompt("Name of the course ")
    attr = attr or click.prompt("Attribute to set: ")
    value = value or click.prompt(f"Value of {attr}: ")

    res = await fetch_course(course)
    if res:
        course_id = res.id
    else:
        print("Sorry, that course does not exist")
        sys.exit(-1)
    try:
        res = await create_course_attribute(course_id, attr, value)
    except UniqueViolation:
        click.echo(f"Can only have one attribute {attr} per course")
    except IntegrityError:
        click.echo(f"Can only have one attribute {attr} per course")

    click.echo("Success")


@cli.command()
@click.argument("course", default=None)
@pass_config
async def showattrs(config, course):
    """
    Show all attributes for a course

    """
    course = course or click.prompt("Name of the course ")

    res = await fetch_course(course)
    if res:
        course_id = res.id
    else:
        print("Sorry, that course does not exist")
        sys.exit(-1)

    attr_dict = await fetch_all_course_attributes(course_id)
    for key in attr_dict:
        print(key, attr_dict[key])


@cli.command()
@click.option(
    "--course", help="The name of a course that should already exist in the DB"
)
@pass_config
async def instructors(config, course):
    """
    List instructor information for all courses or just for a single course

    """
    if course:
        print(f"Instructors for {course}")
        res = await fetch_course_instructors(course)

    else:
        res = await fetch_course_instructors()

    for row in res:
        print(row.id, row.username, row.first_name, row.last_name, row.email)


@cli.command()
@click.argument("domain", default=None)
@pass_config
async def approvedomain(config, domain):
    """
    Approve a domain for LTI 1.3
    """
    if domain:
        print(f"Domain approval for {domain}")
    else:
        domain = click.prompt("Domain to approve")

    res = None
    try:
        res = await create_domain_approval(domain, DomainApprovals.lti1p3)
    except Exception as e:
        print(f"Error fetching domain approval: {e}")
        sys.exit(-1)

    if res:
        print(f"Domain {domain} approved for LTI 1.3")
    else:
        print(f"Domain {domain} already approved for LTI 1.3")


#
#    grade
#


@cli.command()
@click.option("--enforce", is_flag=True, help="Enforce deadline when grading")
@click.option(
    "--course", help="The name of a course that should already exist in the DB"
)
@click.option("--pset", help="Database ID of the Problem Set")
@pass_config
def grade(config, course, pset, enforce):
    """Grade a problem set; hack for long-running grading processes"""
    os.chdir(findProjectRoot())

    userinfo = {}
    userinfo["course"] = course if course else click.prompt("Name of course")
    userinfo["pset"] = pset if pset else click.prompt("Problem Set ID")
    userinfo["enforce_deadline"] = (
        enforce if enforce else click.confirm("Enforce deadline?", default=True)
    )
    os.environ["RSM_USERINFO"] = json.dumps(userinfo)

    subprocess.call(
        f"{sys.executable} web2py.py -S runestone -M -R applications/runestone/rsmanage/grade.py",
        shell=True,
    )


@cli.command()
@click.option(
    "--basecourse",
    help="The name of a course that should already exist in the DB",
    prompt=True,
)
@click.option("--sample_size", help="Number of courses to sample", default=0)
@click.option("--course_list", help="List of courses to sample", default=None)
@pass_config
async def datashop(config, basecourse, sample_size, course_list):
    """Export the course data to the datashop format"""
    if not sample_size:
        sample_size = click.prompt("Sample size", default=0)
    if not course_list and sample_size == 0:
        course_list = click.prompt("Course list")
        if course_list:
            course_list = [c.strip() for c in course_list.split(",")]
        if len(course_list) == 1:
            course_list = course_list[0]

    dburl = config.dburl.replace("+asyncpg", "")
    print(f"Creating Anonymizer {dburl}")
    a = Anonymizer(
        basecourse,
        dburl,
        sample_size=3,
        specific_course=course_list,
        preserve_user_ids=False,
    )
    print("Choosing Courses")
    a.choose_courses()
    print(a.chosen_courses)
    print("Getting Users")
    a.get_users()
    print("Getting user activities")
    a.get_user_activities()
    print("sessionizing")
    a.sessionize_data()
    print("combining to datashop")
    a.create_datashop_data()
    a.write_datashop()


@cli.command()
@pass_config
def db(config):
    """
    Connect to the database based on the current configuration
    """
    sys.exit(subprocess.run(["pgcli", f"{config.dburl.replace('+asyncpg', '')}"]))


@cli.command()
@click.argument("course_name", default=None)
@click.argument("assignment_name", default=None)
@click.option("--sid", default=None)
@click.option("-t", "--timezone", default=0)
@pass_config
async def showanswers(config, course_name, assignment_name, sid, timezone):
    """
    Show students answers for a given assignment

    """
    course_name = course_name or click.prompt("Name of the course ")

    course = await fetch_course(course_name)
    if course:
        click.echo(f"Course ID: {course.id}")
    else:
        click.echo("Sorry, that course does not exist")
        sys.exit(-1)

    assigns = await fetch_assignments(course.course_name)
    current_assignment = None
    for assign in assigns:
        if assign.name == assignment_name:
            current_assignment = assign
            break
    if current_assignment is None:
        click.echo("Sorry, that assignment does not exist")
        click.echo("Here are the available assignments:")
        for assign in assigns:
            click.echo(f"{assign.name}")
        sys.exit(-1)
    engine = create_engine(config.dburl.replace("+asyncpg", ""))
    if sid:
        sid = f"and useinfo.sid = '{sid}'"
    else:
        sid = ""

    aqs = engine.execute(
        f"select question_id, reading_assignment from assignment_questions where assignment_id = {current_assignment.id}"
    )
    has_readings = False
    qlist = []
    for q in aqs:
        if q.reading_assignment:
            has_readings = True
            qlist.append(q.question_id)

    res = engine.execute(
        f"""
    select useinfo.timestamp as ts,name,sid,event,act from assignment_questions 
        join questions ON questions.id = assignment_questions.question_id 
        join useinfo on questions.name = useinfo.div_id 
        where assignment_id = {current_assignment.id} {sid if sid else ""}
        order by sid, useinfo.timestamp
                   """
    )
    click.echo(
        f"Assignment ({current_assignment.id}) Due: {current_assignment.duedate}"
    )

    dd = datetime.timedelta(hours=int(timezone))
    for row in res:
        if (row.ts + dd) > current_assignment.duedate:
            click.echo(
                click.style(
                    f"> {row.ts} {row.sid:<15} {row.name:<40} {row.event:<10} {row.act:<30}",
                    fg="red",
                )
            )
        else:
            click.echo(
                f"< {row.ts} {row.sid:<15} {row.name:<40} {row.event:<10} {row.act:<30}"
            )

    if has_readings:
        click.echo("\n\nReading Assignment Questions")
        qres = engine.execute(
            f"""
        select chapter, subchapter from questions where id in ({','.join([str(q) for q in qlist])})
        """
        )
        div_ids = []
        for row in qres:
            alist = engine.execute(
                f"""
                select name from questions where chapter = '{row.chapter}' and subchapter = '{row.subchapter}' and base_course = '{course.base_course}' and id not in ({','.join([str(q) for q in qlist])})
                """
            )
            for a in alist:
                div_ids.append(a.name)
        if div_ids:
            res = engine.execute(
                f"""
    select useinfo.timestamp as ts,div_id,sid,event,act 
    from useinfo 
    where div_id in ({','.join([f"'{d}'" for d in div_ids])}) {sid} and course_id = '{course.course_name}' 
    order by sid, useinfo.timestamp
                """
            )
        for row in res:
            if (row.ts + dd) > current_assignment.duedate:
                click.echo(
                    click.style(
                        f"> {row.ts} {row.sid:<15} {row.div_id:<40} {row.event:<10} {row.act:<30}",
                        fg="red",
                    )
                )
            else:
                click.echo(
                    f"< {row.ts} {row.sid:<15} {row.div_id:<40} {row.event:<10} {row.act:<30}"
                )


#
# Utility Functions Below here
#


def checkEnvironment():
    """
    Check the list of required and optional environment variables to be sure they are defined.
    """
    stop = False

    load_project_dotenv()

    if "SERVER_CONFIG" not in os.environ:
        click.echo("You must set your SERVER_CONFIG environment variable")
        sys.exit()

    config = os.environ["SERVER_CONFIG"]

    if config == "production":
        click.echo("Checking for required production environment variables")
        for var in REQ_ENV:
            if var not in os.environ:
                stop = True
                click.echo(
                    f"Missing required definition for {var} environment variable"
                )
    elif config == "test":
        if "TEST_DBURL" not in os.environ:
            stop = True
            click.echo("Missing definition for TEST_DBURL environment variable")
    elif config == "development":
        if "DEV_DBURL" not in os.environ:
            stop = True
            click.echo("Missing definition for DEV_DBURL environment variable")

    for var in OPT_ENV:
        if var not in os.environ:
            click.echo(f"You may want to define the {var} environment variable")

    if "DC_DBURL" in os.environ or "DC_DEV_DBURL" in os.environ:
        click.echo("You have defined docker compose specific environment variables")

    if stop:
        click.echo("You must define the required environment variables")
        sys.exit(1)


def echoEnviron(config):
    click.echo(f"RUNESTONE_PATH is {settings.runestone_path}")
    click.echo(f"BOOK_PATH is {settings.book_path}")
    click.echo(f"SERVER_CONFIG is {settings.server_config}")
    click.echo(f"WEB2PY_CONFIG is {config.conf}")
    click.echo(f"The database URL is configured as {config.dburl}")
    click.echo(f"DBNAME is {config.dbname}")


def findProjectRoot():
    start = os.getcwd()
    prevdir = ""
    while start != prevdir:
        if os.path.exists(os.path.join(start, "web2py.py")):
            return start
        prevdir = start
        start = os.path.dirname(start)

    raise IOError("You must be in a web2py application to run rsmanage")


#
#    fill_practice_log_missings
#


def check_db_for_useinfo(config):
    eng = create_engine(config.dburl)
    res = eng.execute("select count(*) from pg_class where relname = 'useinfo'")
    count = res.first()[0]
    return count


@cli.command()
@click.option("--course", help="name of course")
def peergroups(course):
    r = redis.from_url(os.environ.get("REDIS_URI", "redis://redis:6379/0"))
    ap = r.hgetall(f"partnerdb_{course}")
    if len(ap) > 0:
        for x in ap.items():
            click.echo(x)
    else:
        click.echo(f"No Peer Groups found for {course}")


@cli.command()
@click.option("--book", help="document-id or basecourse")
@click.option("--author", help="Runestone username of an author or admin")
@click.option("--github", help="url of book on github", default="")
@pass_config
async def addbookauthor(config, book, author, github):
    """Add a user with author permissions for a book to the Runestone DB.
    Note that this will create the permissions for the user designated as author
    to use the runestone author interface to build and deploy the book.
    The name of the book must match the document-id as defined in the docinfo section
    of the book's PreTeXt source.
    """
    book = book or click.prompt("document-id or basecourse ")
    author = author or click.prompt("Runestone username of an author or admin: ")

    a_row = await fetch_user(author)
    if not a_row:
        click.echo(f"Error - author {author} does not exist")
        sys.exit(-1)
    res = await fetch_course(book)  # verify this is a base course?
    if res:
        if res.base_course != book:
            click.echo(
                f"Error - {book} is not a base course, it is a course based on {res.base_course}"
            )
            sys.exit(-1)
        elif res.course_name == res.base_course:
            click.echo(f"Warning - {book} is already a base course")
        else:
            click.echo(f"Warning - Book {book} already exists in courses table")
    # Create an entry in courses (course_name, term_start_date, institution, base_course, login_required, allow_pairs, student_price, downloads_enabled, courselevel, newserver)
    if not res:
        new_course = CoursesValidator(
            course_name=book,
            base_course=book,
            python3=True,
            term_start_date=datetime.datetime.now(timezone.utc).date(),
            login_required=False,
            institution="Runestone",
            courselevel="",
            downloads_enabled=False,
            allow_pairs=False,
            new_server=True,
        )
        await create_course(new_course)
    # Try to deduce the github url from the working directory
    repo_path = None
    if not github:
        lib_entry = await fetch_library_book(book)
        if lib_entry:
            github = lib_entry.github_url
            if not github:
                click.echo(f"Will now try to deduce the github url for {book}")
        if not github:
            # check to see if book exists under $BOOK_PATH
            github = find_github_url(book)
            if not github:
                book_path = click.prompt(
                    f"Could not find a GitHub URL for {book}. Please provide the path to the repository on your local machine relative to $BOOK_PATH, or leave blank if it is not cloned locally",
                    default="",
                )
                github = find_github_url(book_path)
                if not github:
                    click.echo(
                        "Error: It appears you have not cloned a repo for this book. Exiting."
                    )
                    sys.exit(-1)
                # extract the final part of the path in book_path
                if book_path:
                    book_path = book_path.rstrip("/").split("/")[-1]
                    repo_path = f"/books/{book_path}"
    # create an entry in book_author (author, book)
    try:
        vals = dict(title=f"Temporary title for {book}", github_url=github)
        if repo_path:
            vals["repo_path"] = repo_path
        await create_library_book(book, vals)
    except Exception:
        click.echo(f"Warning: Book: {book} already exists in library")
        if lib_entry.github_url != github:
            vals = dict(github_url=github)
            if repo_path:
                vals["repo_path"] = repo_path
            await update_library_book(lib_entry.id, vals)

    try:
        await create_book_author(author, book)
    except Exception:
        click.echo(f"Warning: It appears that {author} is already an author of {book}")

    # create an entry in auth_membership (group_id, user_id)
    auth_row = await fetch_group("author")
    auth_group_id = auth_row.id

    if not await is_author(a_row.id):
        await create_membership(auth_group_id, a_row.id)


def find_github_url(book):
    book_path = os.path.join(settings.book_path, book)
    if os.path.exists(book_path):
        # try to find the .git directory
        git_path = os.path.join(book_path, ".git")
        if os.path.exists(git_path):
            # try to get the remote url from git
            res = subprocess.run(
                ["git", "-C", book_path, "config", "--get", "remote.origin.url"],
                capture_output=True,
                text=True,
            )
            if res.returncode == 0:
                return res.stdout.strip()
            else:
                click.echo("Could not determine github url from git config")
        else:
            click.echo(f"No .git directory found in {book_path}")
    else:
        click.echo(
            click.style(f"Warning: Book path {book_path} does not exist", fg="yellow")
        )
        return None
    return None


# command group for mangaging the library table


@cli.group()
@click.pass_context
def library(ctx):
    """subcommands for managing the library table"""
    pass


@library.command("visible")
@click.pass_context
@click.argument("book")
@click.option("--show/--hide", default=True, help="show the book in the library")
async def library_visible(ctx, book, show):
    """
    Show or hide the book on the library page
    """
    print(f"Setting the is_visible flag to {show} for {book} in the library")
    bookrec = await fetch_library_book(book)
    await update_library_book(bookrec.id, dict(is_visible=show))


@library.command("forclass")
@click.pass_context
@click.argument("book")
@click.option(
    "--show/--hide", default=True, help="show the book in the custom course page"
)
async def library_forclass(ctx, book, show):
    """
    Show or hide the book in the course creation page
    """
    print(f"Setting the for_classes flag to {show} for {book} in the library")
    bookrec = await fetch_library_book(book)
    await update_library_book(bookrec.id, dict(for_classes=show))


@library.command("show")
@click.pass_context
@click.argument("book")
async def library_show(ctx, book):
    """Show all data for this book in the library"""
    bookrec = await fetch_library_book(book)
    click.echo(f"Title: {bookrec.title}")
    click.echo(f"Authors: {bookrec.authors}")
    click.echo(f"shelf sections: {bookrec.shelf_section}")
    click.echo(f"description: {bookrec.description}")
    click.echo("-----------------")
    click.echo(f"for_classes: {bookrec.for_classes}")
    click.echo(f"is_visible: {bookrec.is_visible}")
    click.echo(f"repo_path: {bookrec.repo_path}")
    click.echo(f"github_url: {bookrec.github_url}")


@library.command("repo_path")
@click.pass_context
@click.argument("book")
@click.option("--path", default=None, help="Path to the book on your local machine")
async def library_repo_path(ctx, book, path):
    """
    Set the repo_path for the book in the library
    """
    if not path:
        path = click.prompt(
            "Please provide the path to the book on your local machine relative to $BOOK_PATH"
        )
    print(f"Setting the repo_path to {path} for {book} in the library")
    if path.startswith("/"):
        click.echo(
            click.style(
                "Warning: The path should be relative to $BOOK_PATH, not an absolute path",
                fg="yellow",
            )
        )
        path = path.split("/")[-1]  # get the last part of the path
    path = f"/books/{path}"  # prepend /books/ to the path
    bookrec = await fetch_library_book(book)
    await update_library_book(bookrec.id, dict(repo_path=path))


# add a new library command to set the github_url for the book
@library.command("github")
@click.pass_context
@click.argument("book")
@click.option("--url", default=None, help="GitHub URL of the book repository")
async def library_github(ctx, book, url):
    """
    Set the github_url for the book in the library
    """
    if not url:
        url = click.prompt("Please provide the GitHub URL of the book repository")
    print(f"Setting the github_url to {url} for {book} in the library")
    bookrec = await fetch_library_book(book)
    await update_library_book(bookrec.id, dict(github_url=url))


if __name__ == "__main__":
    cli(_anyio_backend="asyncio")
