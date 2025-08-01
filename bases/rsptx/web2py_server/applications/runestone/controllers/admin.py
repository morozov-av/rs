# *******************************
# |docname| - route to a textbook
# *******************************
# This controller provides routes to admin functions
#
# Imports
# =======
# These are listed in the order prescribed by `PEP 8
# <http://www.python.org/dev/peps/pep-0008/#imports>`_.
#
# Standard library
# ----------------
import base64
import csv
import datetime
import io
import json
import logging
import re
import uuid
from collections import OrderedDict, Counter
from random import randint
import asyncio

# Third Party library
# -------------------
import boto3, botocore  # for the S3 API
from dateutil.parser import parse
from rs_grading import _get_assignment, send_lti_grades
from runestone import cmap
import pandas as pd
import altair as alt

from rs_practice import _get_qualified_questions

from rsptx.db.crud import fetch_lti_version
from rsptx.lti1p3.core import attempt_lti1p3_score_updates

logger = logging.getLogger(settings.logger)
logger.setLevel(settings.log_level)

admin_logger(logger)

ALL_AUTOGRADE_OPTIONS = ["manual", "all_or_nothing", "pct_correct", "interact"]
AUTOGRADE_POSSIBLE_VALUES = dict(
    actex=ALL_AUTOGRADE_OPTIONS,
    activecode=ALL_AUTOGRADE_OPTIONS,
    clickablearea=["manual", "all_or_nothing", "pct_correct", "interact"],
    codelens=ALL_AUTOGRADE_OPTIONS,
    datafile=[],
    dragndrop=["manual", "all_or_nothing", "pct_correct", "interact"],
    external=[],
    fillintheblank=ALL_AUTOGRADE_OPTIONS,
    groupsub=[],
    khanex=ALL_AUTOGRADE_OPTIONS,
    hparsons=ALL_AUTOGRADE_OPTIONS,
    lp_build=ALL_AUTOGRADE_OPTIONS,
    mchoice=ALL_AUTOGRADE_OPTIONS + ["peer", "peer_chat"],
    page=["interact"],
    parsonsprob=ALL_AUTOGRADE_OPTIONS,
    poll=["interact"],
    quizly=ALL_AUTOGRADE_OPTIONS,
    reveal=[],
    selectquestion=ALL_AUTOGRADE_OPTIONS,
    shortanswer=ALL_AUTOGRADE_OPTIONS,
    showeval=["interact"],
    video=["interact"],
    webwork=ALL_AUTOGRADE_OPTIONS,
    youtube=["interact"],
)

AUTOGRADEABLE = set(
    [
        "clickablearea",
        "codelens",
        "dragndrop",
        "fillintheblank",
        "khanex",
        "mchoice",
        "hparsons",
        "parsonsprob",
        "quizly",
        "selectquestion",
        "webwork",
    ]
)

ALL_WHICH_OPTIONS = ["first_answer", "last_answer", "best_answer"]
WHICH_TO_GRADE_POSSIBLE_VALUES = dict(
    actex=ALL_WHICH_OPTIONS,
    activecode=ALL_WHICH_OPTIONS,
    clickablearea=ALL_WHICH_OPTIONS,
    codelens=ALL_WHICH_OPTIONS,
    datafile=[],
    dragndrop=ALL_WHICH_OPTIONS,
    external=[],
    fillintheblank=ALL_WHICH_OPTIONS,
    groupsub=[],
    hparsons=ALL_WHICH_OPTIONS,
    khanex=ALL_WHICH_OPTIONS,
    lp_build=ALL_WHICH_OPTIONS,
    mchoice=ALL_WHICH_OPTIONS + ["all_answer"],
    page=ALL_WHICH_OPTIONS,
    parsonsprob=ALL_WHICH_OPTIONS,
    poll=[],
    quizly=ALL_WHICH_OPTIONS,
    reveal=[],
    selectquestion=ALL_WHICH_OPTIONS,
    shortanswer=ALL_WHICH_OPTIONS,
    showeval=ALL_WHICH_OPTIONS,
    video=[],
    webwork=ALL_WHICH_OPTIONS,
    youtube=[],
)

ANSWER_TABLES = [
    "mchoice_answers",
    "clickablearea_answers",
    "codelens_answers",
    "dragndrop_answers",
    "fitb_answers",
    "parsons_answers",
    "shortanswer_answers",
    "microparsons_answers",
    "lp_answers",
    "shortanswer_answers",
    "unittest_answers",
    "webwork_answers",
]


@auth.requires_login()
def index():
    redirect(URL("admin", "admin"))


@auth.requires_login()
def doc():
    response.title = "Documentation"
    is_instructor = verifyInstructorStatus(auth.user.course_name, auth.user)
    return dict(
        course_id=auth.user.course_name,
        course=get_course_row(db.courses.ALL),
        is_instructor=is_instructor,
    )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def assignments():
    """
    This is called for the assignments tab on the instructor interface
    When an assignment is selected get_assignment is called to gather the details
    for that assignment.
    """
    response.title = "Assignments"
    cur_assignments = db(db.assignments.course == auth.user.course_id).select(
        orderby=db.assignments.duedate
    )
    assigndict = OrderedDict()
    for row in cur_assignments:
        assigndict[row.id] = row.name

    try:
        selected_assignment = int(request.vars.selected_assignment)
    except Exception:
        selected_assignment = -1

    logger.debug("selected_assignment XYZ = {}".format(selected_assignment))
    tags = []
    # tag_query = db(db.tags).select()
    # for tag in tag_query:
    #     tags.append(tag.tag_name)

    course = get_course_row(db.courses.ALL)
    base_course = course.base_course
    chapter_labels = []
    chapters_query = db(db.chapters.course_id == base_course).select(
        db.chapters.chapter_label
    )
    for row in chapters_query:
        chapter_labels.append(row.chapter_label)

    # See `models/db_ebook.py` for course_attributes table
    set_latex_preamble(course.base_course)
    course_attrs = getCourseAttributesDict(course.id, base_course)

    return dict(
        coursename=auth.user.course_name,
        confirm=False,
        course_id=auth.user.course_name,
        assignments=assigndict,
        tags=tags,
        chapters=chapter_labels,
        toc=_get_toc_and_questions(),  # <-- This Gets the readings and questions
        course=course,
        is_instructor=True,
        ptx_js_version=course_attrs.get("ptx_js_version", "0.33"),
        webwork_js_version=course_attrs.get("webwork_js_version", "2.18"),
        selected_assignment=selected_assignment,
        default_language=course_attrs.get("default_language", "python"),
    )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def practice():
    response.title = "Practice"
    course = db(db.courses.id == auth.user.course_id).select().first()
    course_start_date = course.term_start_date
    course_attrs = getCourseAttributesDict(course.id, course.base_course)
    start_date = course_start_date + datetime.timedelta(days=13)
    end_date = start_date + datetime.timedelta(weeks=12)  # provide a reasonable default
    max_practice_days = 50
    max_practice_questions = 500
    day_points = 2
    question_points = 0.2
    questions_to_complete_day = 10
    flashcard_creation_method = 0
    # 0 is self paced - when a student marks a page complete
    # 1 is removed - it was for when a reading assignment deadline passes but was not implemented
    # 2 is manually as checked by the instructor
    graded = 1
    spacing = 0
    interleaving = 0
    error_start_date = 0
    error_end_date = 0
    error_max_practice_days = 0
    error_max_practice_questions = 0
    error_day_points = 0
    error_question_points = 0
    error_questions_to_complete_day = 0
    error_flashcard_creation_method = 0
    error_graded = 0

    already_exists = 0
    any_practice_settings = db(
        (db.course_practice.auth_user_id == auth.user.id)
        | (db.course_practice.course_name == course.course_name)
    )

    practice_settings = any_practice_settings(
        db.course_practice.course_name == course.course_name
    )
    # If the instructor has created practice for other courses, don't randomize spacing and interleaving for the new
    # course.
    if not any_practice_settings.isempty():
        any_practice_settings = any_practice_settings.select(
            orderby=~db.course_practice.id
        ).first()
        spacing = any_practice_settings.spacing
        interleaving = any_practice_settings.interleaving

        #  Now checking to see if there are practice settings for this course.
        #  If not, stick with the defaults.
        if (
            not practice_settings.isempty()
            and practice_settings.select(orderby=~db.course_practice.id)
            .first()
            .end_date
            is not None
            and practice_settings.select(orderby=~db.course_practice.id)
            .first()
            .end_date
            != ""
        ):
            practice_setting = practice_settings.select(
                orderby=~db.course_practice.id
            ).first()
            start_date = practice_setting.start_date
            end_date = practice_setting.end_date
            max_practice_days = practice_setting.max_practice_days
            max_practice_questions = practice_setting.max_practice_questions
            day_points = practice_setting.day_points
            question_points = practice_setting.question_points
            questions_to_complete_day = practice_setting.questions_to_complete_day
            flashcard_creation_method = practice_setting.flashcard_creation_method
            graded = practice_setting.graded
            spacing = practice_setting.spacing
            interleaving = practice_setting.interleaving
            already_exists = 1
    else:
        if randint(0, 1) == 1:
            spacing = 1
        if randint(0, 1) == 1:
            interleaving = 1
    if practice_settings.isempty():  # If there are no settings for THIS course
        db.course_practice.insert(
            auth_user_id=auth.user.id,
            course_name=course.course_name,
            start_date=start_date,
            end_date=end_date,
            max_practice_days=max_practice_days,
            max_practice_questions=max_practice_questions,
            day_points=day_points,
            question_points=question_points,
            questions_to_complete_day=questions_to_complete_day,
            flashcard_creation_method=flashcard_creation_method,
            graded=graded,
            spacing=spacing,
            interleaving=interleaving,
        )
        practice_settings = db(
            (db.course_practice.auth_user_id == auth.user.id)
            & (db.course_practice.course_name == course.course_name)
        )

    toc = "''"
    if flashcard_creation_method == 2:
        toc = _get_toc_and_questions(True)

    # If the GET request is to open the page for the first time (they're not submitting the form):
    if not (
        "StartDate" in request.vars
        or "EndDate" in request.vars
        or "maxPracticeDays" in request.vars
        or "maxPracticeQuestions" in request.vars
        or "pointsPerDay" in request.vars
        or "pointsPerQuestion" in request.vars
        or "questionsPerDay" in request.vars
        or "flashcardsCreationType" in request.vars
        or "question_points" in request.vars
        or "graded" in request.vars
    ):
        return dict(
            course_start_date=course_start_date,
            start_date=start_date,
            end_date=end_date,
            max_practice_days=max_practice_days,
            max_practice_questions=max_practice_questions,
            day_points=day_points,
            question_points=question_points,
            questions_to_complete_day=questions_to_complete_day,
            flashcard_creation_method=flashcard_creation_method,
            graded=graded,
            spacing=spacing,
            interleaving=interleaving,
            toc=toc,
            error_start_date=error_start_date,
            error_end_date=error_end_date,
            error_max_practice_days=error_max_practice_days,
            error_max_practice_questions=error_max_practice_questions,
            error_day_points=error_day_points,
            error_question_points=error_question_points,
            error_questions_to_complete_day=error_questions_to_complete_day,
            error_flashcard_creation_method=error_flashcard_creation_method,
            error_graded=error_graded,
            complete=already_exists,
            course=course,
            default_language=course_attrs.get("default_language", "python"),
        )
    else:
        try:
            start_date = datetime.datetime.strptime(
                request.vars.get("StartDate", None), "%Y-%m-%d"
            ).date()
            if start_date < course_start_date:
                error_start_date = 1
        except Exception:
            error_start_date = 1
        try:
            end_date = datetime.datetime.strptime(
                request.vars.get("EndDate", None), "%Y-%m-%d"
            ).date()
            if end_date < start_date:
                error_end_date = 1
        except Exception:
            error_end_date = 1
        if spacing == 1:
            try:
                max_practice_days = int(request.vars.get("maxPracticeDays", None))
            except Exception:
                error_max_practice_days = 1
        else:
            try:
                max_practice_questions = int(
                    request.vars.get("maxPracticeQuestions", None)
                )
            except Exception:
                error_max_practice_questions = 1
        if spacing == 1:
            try:
                day_points = float(request.vars.get("pointsPerDay", None))
            except Exception:
                error_day_points = 1
        else:
            try:
                question_points = float(request.vars.get("pointsPerQuestion", None))
            except Exception:
                error_question_points = 1
        if spacing == 1:
            try:
                questions_to_complete_day = int(
                    request.vars.get("questionsPerDay", None)
                )
            except Exception:
                error_questions_to_complete_day = 1
        try:
            flashcard_creation_method = int(
                request.vars.get("flashcardsCreationType", None)
            )
        except Exception:
            error_flashcard_creation_method = 1
        try:
            graded = int(request.vars.get("graded", None))
        except Exception:
            error_graded = 1

        no_error = 0
        if (
            error_start_date == 0
            and error_end_date == 0
            and error_max_practice_days == 0
            and error_max_practice_questions == 0
            and error_day_points == 0
            and error_question_points == 0
            and error_questions_to_complete_day == 0
            and error_flashcard_creation_method == 0
            and error_graded == 0
        ):
            no_error = 1
        if no_error == 1:
            practice_settings.update(
                start_date=start_date,
                end_date=end_date,
                max_practice_days=max_practice_days,
                max_practice_questions=max_practice_questions,
                day_points=day_points,
                question_points=question_points,
                questions_to_complete_day=questions_to_complete_day,
                flashcard_creation_method=flashcard_creation_method,
                graded=graded,
                spacing=spacing,
                interleaving=interleaving,
            )

        toc = "''"
        if flashcard_creation_method == 2:
            toc = _get_toc_and_questions(True)
        return dict(
            course_id=auth.user.course_name,
            course_start_date=course_start_date,
            start_date=start_date,
            end_date=end_date,
            max_practice_days=max_practice_days,
            max_practice_questions=max_practice_questions,
            day_points=day_points,
            question_points=question_points,
            questions_to_complete_day=questions_to_complete_day,
            flashcard_creation_method=flashcard_creation_method,
            graded=graded,
            spacing=spacing,
            interleaving=interleaving,
            error_graded=error_graded,
            toc=toc,
            error_start_date=error_start_date,
            error_end_date=error_end_date,
            error_max_practice_days=error_max_practice_days,
            error_max_practice_questions=error_max_practice_questions,
            error_day_points=error_day_points,
            error_question_points=error_question_points,
            error_questions_to_complete_day=error_questions_to_complete_day,
            error_flashcard_creation_method=error_flashcard_creation_method,
            complete=no_error,
            course=course,
            is_instructor=True,
            default_language=course_attrs.get("default_language", "python"),
        )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def add_practice_items():
    response.title = "Add Practice Items"
    course = db(db.courses.course_name == auth.user.course_name).select().first()
    data = json.loads(request.vars.data)

    # Was for Python 2.x
    # string_data = [x.encode('UTF8') for x in data]
    # Is for Python 3.x
    string_data = data

    now = datetime.datetime.utcnow()
    now_local = now - datetime.timedelta(hours=float(session.timezoneoffset))

    students = db((db.auth_user.course_name == auth.user.course_name)).select()
    chapters = db((db.chapters.course_id == course.base_course)).select()
    for chapter in chapters:
        subchapters = db((db.sub_chapters.chapter_id == chapter.id)).select()
        for subchapter in subchapters:
            subchapterTaught = db(
                (db.sub_chapter_taught.course_name == auth.user.course_name)
                & (db.sub_chapter_taught.chapter_label == chapter.chapter_label)
                & (
                    db.sub_chapter_taught.sub_chapter_label
                    == subchapter.sub_chapter_label
                )
            )
            questions = _get_qualified_questions(
                course.base_course,
                chapter.chapter_label,
                subchapter.sub_chapter_label,
                db,
            )
            if (
                "{}/{}".format(chapter.chapter_name, subchapter.sub_chapter_name)
                in string_data
            ):
                if subchapterTaught.isempty() and len(questions) > 0:
                    db.sub_chapter_taught.insert(
                        course_name=auth.user.course_name,
                        chapter_label=chapter.chapter_label,
                        sub_chapter_label=subchapter.sub_chapter_label,
                        teaching_date=now_local.date(),
                    )
                    for student in students:
                        flashcards = db(
                            (db.user_topic_practice.user_id == student.id)
                            & (db.user_topic_practice.course_name == course.course_name)
                            & (
                                db.user_topic_practice.chapter_label
                                == chapter.chapter_label
                            )
                            & (
                                db.user_topic_practice.sub_chapter_label
                                == subchapter.sub_chapter_label
                            )
                        )
                        if flashcards.isempty():
                            db.user_topic_practice.insert(
                                user_id=student.id,
                                course_name=course.course_name,
                                chapter_label=chapter.chapter_label,
                                sub_chapter_label=subchapter.sub_chapter_label,
                                question_name=questions.first().name,
                                i_interval=0,
                                e_factor=2.5,
                                q=0,
                                next_eligible_date=now_local.date(),
                                # add as if yesterday, so can practice right away
                                last_presented=now.date() - datetime.timedelta(1),
                                last_completed=now.date() - datetime.timedelta(1),
                                creation_time=now,
                                timezoneoffset=float(session.timezoneoffset),
                            )
            else:
                if not subchapterTaught.isempty():
                    subchapterTaught.delete()
                    db(
                        (db.user_topic_practice.course_name == course.course_name)
                        & (
                            db.user_topic_practice.chapter_label
                            == chapter.chapter_label
                        )
                        & (
                            db.user_topic_practice.sub_chapter_label
                            == subchapter.sub_chapter_label
                        )
                    ).delete()
    return json.dumps(dict(complete=True))


# This is the primary controller when the instructor goes to the admin page.
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def admin():
    response.title = "Admin"
    sidQuery = db(db.courses.course_name == auth.user.course_name).select().first()
    # Now get the start date
    dateQuery = db(db.courses.course_name == auth.user.course_name).select()
    date = dateQuery[0].term_start_date
    date = date.strftime("%m/%d/%Y")
    my_build = ""
    my_vers = 0
    mst_vers = 0

    cur_instructors = db(db.course_instructor.course == auth.user.course_id).select(
        db.course_instructor.instructor
    )
    instructordict = {}
    for row in cur_instructors:
        name = db(db.auth_user.id == row.instructor).select(
            db.auth_user.first_name, db.auth_user.last_name
        )
        for person in name:
            instructordict[str(row.instructor)] = (
                person.first_name + " " + person.last_name
            )

    cur_students = db(
        (db.user_courses.course_id == auth.user.course_id)
        & (db.user_courses.user_id == db.auth_user.id)
    ).select(
        db.user_courses.user_id,
        orderby=db.auth_user.last_name | db.auth_user.first_name,
    )

    studentdict = OrderedDict()
    for row in cur_students:
        person = db(db.auth_user.id == row.user_id).select(
            db.auth_user.username, db.auth_user.first_name, db.auth_user.last_name
        )
        for identity in person:
            name = (
                identity.first_name
                + " "
                + identity.last_name
                + "  ("
                + identity.username
                + ")"
            )
            if row.user_id not in instructordict:
                studentdict[row.user_id] = name

    course = db(db.courses.course_name == auth.user.course_name).select().first()
    course_attrs = getCourseAttributesDict(course.id, course.base_course)

    instructor_course_list = db(
        (db.course_instructor.instructor == auth.user.id)
        & (db.courses.id == db.course_instructor.course)
        & (db.courses.base_course == course.base_course)
        & (db.courses.course_name != course.course_name)
    ).select(db.courses.course_name, db.courses.id)
    base_course_id = (
        db(db.courses.course_name == course.base_course)
        .select(db.courses.course_name, db.courses.id)
        .first()
    )
    instructor_course_list.append(base_course_id)
    base_course_id = base_course_id.id
    curr_start_date = course.term_start_date.strftime("%m/%d/%Y")
    downloads_enabled = "true" if sidQuery.downloads_enabled else "false"
    allow_pairs = "true" if sidQuery.allow_pairs else "false"
    keys = (
        db(
            (db.course_lti_map.course_id == auth.user.course_id)
            & (db.lti_keys.id == db.course_lti_map.lti_id)
        )
        .select()
        .first()
    )
    if keys:
        consumer = keys.lti_keys.consumer
        secret = keys.lti_keys.secret
    else:
        consumer = ""
        secret = ""

    lti_version = fetch_lti_version(course.id)

    # valid exams to show are:
    # Exams the instructor has created for their course
    # Or exams embedded in the base course.  Embedded exams will have from_source
    # set to True and will have the base course id instead of this courses id.
    exams = db(
        (db.assignments.is_timed == True)
        & (
            (db.assignments.course == course.id)
            | (
                (db.assignments.from_source == True)
                & (db.assignments.course == base_course_id)
            )
        )
    ).select()
    exams = [x.name for x in exams]
    try:
        motd = open("applications/runestone/static/motd.html").read()
    except Exception:
        motd = "You can cusomize this mesage by editing /static/motd.html"
    logger.debug(course_attrs)

    if "groupsize" not in course_attrs:
        course_attrs["groupsize"] = "3"

    if "show_points" not in course_attrs or course_attrs["show_points"] != "true":
        course_attrs["show_points"] = False
    else:
        course_attrs["show_points"] = True

    if (
        "ignore_lti_dates" not in course_attrs
        or course_attrs["ignore_lti_dates"] != "true"
    ):
        course_attrs["ignore_lti_dates"] = False
    else:
        course_attrs["ignore_lti_dates"] = True

    if (
        "no_lti_auto_grade_update" not in course_attrs
        or course_attrs["no_lti_auto_grade_update"] != "true"
    ):
        course_attrs["no_lti_auto_grade_update"] = False
    else:
        course_attrs["no_lti_auto_grade_update"] = True

    return dict(
        startDate=date,
        courseDomain=course.domain_name,
        coursename=auth.user.course_name,
        course_id=auth.user.course_name,
        instructors=instructordict,
        students=studentdict,
        curr_start_date=curr_start_date,
        confirm=True,
        build_info=my_build,
        my_vers=my_vers,
        mst_vers=mst_vers,
        course=sidQuery,
        downloads_enabled=downloads_enabled,
        allow_pairs=allow_pairs,
        instructor_course_list=instructor_course_list,
        motd=motd,
        consumer=consumer,
        secret=secret,
        lti_version=lti_version,
        examlist=exams,
        is_instructor=True,
        **course_attrs,
    )


# Called in admin.js from courseStudents to populate  the list of students
# eBookConfig.getCourseStudentsURL
# Deprecated -- use /ns/auth/course_students
@auth.requires_login()
def course_students():
    response.headers["content-type"] = "application/json"
    row = get_course_row()
    if row.course_name == row.base_course and not verifyInstructorStatus(
        auth.user.course_id, auth.user
    ):
        return json.dumps({"message": "invalid call for this course"})

    cur_students = db(
        (db.user_courses.course_id == auth.user.course_id)
        & (db.auth_user.id == db.user_courses.user_id)
    ).select(
        db.auth_user.username,
        db.auth_user.first_name,
        db.auth_user.last_name,
        db.auth_user.id,
        orderby=db.auth_user.last_name | db.auth_user.first_name,
    )
    instructors = db(db.course_instructor.course == auth.user.course_id).select()
    iset = set()
    for i in instructors:
        iset.add(i.instructor)

    searchdict = OrderedDict()
    for row in cur_students:
        if row.id not in iset:
            name = row.first_name + " " + row.last_name
            username = row.username
            searchdict[str(username)] = name
    return json.dumps(searchdict)


# Called when an instructor clicks on the grading tab
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def grading():
    response.title = "Grading"
    assignments = {}
    assignments_query = db(db.assignments.course == auth.user.course_id).select()
    selected_assignment = request.vars.selected_assignment
    assignmentids = {}
    assignment_deadlines = {}
    question_points = {}
    instructors = db(db.course_instructor.course == auth.user.course_id).select()
    iset = set()
    for i in instructors:
        iset.add(i.instructor)

    for row in assignments_query:
        assignmentids[row.name] = int(row.id)
        # Retrieve relevant info for each question, ordering them based on their
        # order in the assignment.
        assignment_questions = db(
            (db.assignment_questions.assignment_id == int(row.id))
            & (db.assignment_questions.question_id == db.questions.id)
        ).select(
            db.assignment_questions.question_id,
            db.assignment_questions.points,
            db.questions.name,
            db.questions.question_type,
            db.questions.autograde,
            orderby=db.assignment_questions.sorting_priority,
        )
        questions = []
        if row.name not in question_points:
            question_points[row.name] = {}
        for q in assignment_questions:
            if (
                q.questions.question_type in AUTOGRADEABLE
                or q.questions.autograde == "unittest"
            ):
                name_suff = "+"
            else:
                name_suff = ""
            questions.append(q.questions.name + name_suff)
            question_points[row.name][q.questions.name] = q.assignment_questions.points

        assignments[row.name] = questions
        assignment_deadlines[row.name] = row.duedate.replace(
            tzinfo=datetime.timezone.utc
        ).isoformat()

    cur_students = db(db.user_courses.course_id == auth.user.course_id).select(
        db.user_courses.user_id
    )
    # TODO: investigate why this search dict is overriden by a call to course_students
    # on the grading page load????
    searchdict = {}
    for row in cur_students:
        isinstructor = row.user_id in iset
        logger.debug(f"User {row.user_id} instructor status {isinstructor}")
        if not isinstructor:
            person = (
                db(db.auth_user.id == row.user_id)
                .select(
                    db.auth_user.username,
                    db.auth_user.first_name,
                    db.auth_user.last_name,
                )
                .first()
            )
            name = person.first_name + " " + person.last_name
            username = person.username
            searchdict[username] = name
            sd_by_student = sorted(
                searchdict.items(), key=lambda x: x[1].split()[-1].lower()
            )
            searchdict = OrderedDict(sd_by_student)
            logger.debug(f"Added {username} to searchdict")

    course = db(db.courses.id == auth.user.course_id).select().first()
    base_course = course.base_course
    chapter_labels = {}
    chapters_query = db(db.chapters.course_id == base_course).select()
    for row in chapters_query:
        q_list = []
        chapter_questions = db(
            (db.questions.chapter == row.chapter_label)
            & (db.questions.base_course == base_course)
            & (db.questions.question_type != "page")
        ).select(orderby=db.questions.name)
        for chapter_q in chapter_questions:
            q_list.append(chapter_q.name)
        chapter_labels[row.chapter_label] = q_list

    course_attrs = getCourseAttributesDict(course.id, base_course)

    is_lti_course = (
        asyncio.get_event_loop().run_until_complete(fetch_lti_version(course.id))
        != None
    )

    set_latex_preamble(base_course)
    return dict(
        assignmentinfo=json.dumps(assignments),
        students=searchdict,
        chapters=json.dumps(chapter_labels),
        gradingUrl=URL("assignments", "get_problem"),
        autogradingUrl=URL("assignments", "autograde"),
        gradeRecordingUrl=URL("assignments", "record_grade"),
        calcTotalsURL=URL("assignments", "calculate_totals"),
        setTotalURL=URL("assignments", "record_assignment_score"),
        sendLTIGradeURL=URL("assignments", "send_assignment_score_via_LTI"),
        getCourseStudentsURL=URL("admin", "course_students"),
        get_assignment_release_statesURL=URL("admin", "get_assignment_release_states"),
        is_lti_course=is_lti_course,
        course_id=auth.user.course_name,
        assignmentids=json.dumps(assignmentids),
        assignment_deadlines=json.dumps(assignment_deadlines),
        question_points=json.dumps(question_points),
        is_instructor=True,
        ptx_js_version=course_attrs.get("ptx_js_version", "0.2"),
        webwork_js_version=course_attrs.get("webwork_js_version", "2.17"),
        default_language=course_attrs.get("default_language", "python"),
        course=course,
        selected_assignment=selected_assignment,
    )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def removeStudents():
    """
    Remove one or more students from the current course
    The query string should contain the key studentList which can be either
    a single id from auth_user or it could be a list of ids.

    This does not remove a student from the database but rather marks them as inactive in
    the database and moves them to the basecourse if they are not already enrolled in it.
    """

    baseCourseName = (
        db(db.courses.course_name == auth.user.course_name)
        .select(db.courses.base_course)[0]
        .base_course
    )
    baseCourseID = (
        db(db.courses.course_name == baseCourseName).select(db.courses.id)[0].id
    )

    if not isinstance(request.vars["studentList"], str):
        # Multiple ids selected
        studentList = request.vars["studentList"]
    elif request.vars["studentList"] == "None":
        # No id selected
        session.flash = T("No valid students were selected")
        return redirect("/%s/admin/admin" % (request.application))
    else:
        # One id selected
        studentList = [request.vars["studentList"]]

    for studentID in studentList:
        logger.warning(
            "{} has requested the removal of {}".format(auth.user.username, studentID)
        )
        if studentID.isdigit() and int(studentID) != auth.user.id:
            sid = (
                db(db.auth_user.id == int(studentID))
                .select(db.auth_user.username)
                .first()
            )
            db(
                (db.user_courses.user_id == int(studentID))
                & (db.user_courses.course_id == auth.user.course_id)
            ).delete()

            baseCourseEnrollment = (
                db(
                    (db.user_courses.user_id == int(studentID))
                    & (db.user_courses.course_id == int(baseCourseID))
                )
                .select(db.user_courses.id)
                .first()
            )
            if baseCourseEnrollment is not None:
                logger.debug(
                    "{} is already enrolled in base course {}".format(
                        studentID, baseCourseName
                    )
                )
            else:
                logger.debug(
                    "moving {} into base course {}".format(studentID, baseCourseName)
                )
                db.user_courses.insert(user_id=int(studentID), course_id=baseCourseID)
            db(db.auth_user.id == int(studentID)).update(
                course_id=baseCourseID, course_name=baseCourseName, active="F"
            )
            db(
                (db.useinfo.sid == sid)
                & (db.useinfo.course_id == auth.user.course_name)
            ).update(course_id=baseCourseName)
            for tbl in ANSWER_TABLES:
                db(
                    (db[tbl].sid == sid)
                    & (db[tbl].course_name == auth.user.course_name)
                ).update(course_name=baseCourseName)
            db(
                (db.code.sid == sid) & (db.code.course_id == auth.user.course_id)
            ).update(course_id=baseCourseID)
            # leave user_chapter_progress and user_sub_chapter_progress alone for now.

    session.flash = T("You have successfully removed students")
    return redirect("/%s/admin/admin" % (request.application))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def removeinstructor():
    """
    admin/removeinstructor/<int>

    """
    removed = []
    if not request.args[0].isnumeric():
        session.flash = T(f"""instructor id is not numeric: {request.args[0]}""")
        logger.error(f"instructor id is not numeric: {request.args[0]}")
        return json.dumps("Error")

    if request.args[0] != str(auth.user.id):
        db(
            (db.course_instructor.instructor == request.args[0])
            & (db.course_instructor.course == auth.user.course_id)
        ).delete()
        removed.append(True)
        return json.dumps(removed)
    else:
        session.flash = T("You cannot remove yourself as an instructor.")
        removed.append(False)
        return json.dumps(removed)


# This function is used from the web admin page to add TA's or co-instructors to the course.
# It is not used by the rsmanage command.
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def addinstructor():
    """
    admin/addinstructor/<int>

    """
    response.headers["content-type"] = "application/json"
    instructor = request.args(0)
    res = db(db.auth_user.id == instructor).select().first()
    if res:
        try:
            db.course_instructor.insert(
                course=auth.user.course_id, instructor=instructor
            )
            retval = "Success"
        except:
            retval = "Error:  Adding a duplicate instructor"
    else:
        retval = "Cannot add non-existent user as instructor"
        logger.error("Trying to add non-user {} as instructor".format(instructor))

    return json.dumps(retval)


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def deletecourse():
    course_name = auth.user.course_name
    cset = db(db.courses.course_name == course_name)
    if not cset.isempty():
        res = cset.select(db.courses.id, db.courses.base_course).first()
        courseid = res.id
        basecourse = res.base_course
        bcid = db(db.courses.course_name == basecourse).select(db.courses.id).first()
        qset = db(
            (db.course_instructor.course == courseid)
            & (db.course_instructor.instructor == auth.user.id)
        )
        if not qset.isempty():
            qset.delete()
            students = db(db.auth_user.course_id == courseid)
            students.update(course_id=bcid)
            uset = db(db.user_courses.course_id == courseid)
            uset.delete()
            # remove the rows from useinfo
            infoset = db(db.useinfo.course_id == course_name)
            infoset.delete()
            # remove the rows from xxx_answers
            for tbl in ANSWER_TABLES + ["timed_exam"]:
                ansset = db(db[tbl].course_name == course_name)
                ansset.delete()
            db(db.courses.id == courseid).delete()
            try:
                session.clear()
            except Exception:
                session.flash = "Error, %s does not appear to exist" % course_name
        else:
            session.flash = "You are not the instructor of %s" % course_name
    else:
        session.flash = "course, %s, not found" % course_name

    redirect(URL("default", "index"))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def removeassign():
    response.headers["content-type"] = "application/json"

    try:
        assignment_id = int(request.vars["assignid"])
    except Exception as e:
        logger.error(
            "Could not remove assignment {} error {}".format(
                request.vars["assignid"], e
            )
        )
        session.flash = "Cannot remove assignment with id of {}".format(
            request.vars["assignid"]
        )
        logger.error("Cannot Remove Assignment {}".format(request.args(0)))
        return "Error"

    logger.debug("Removing assignment {}".format(assignment_id))
    ct = db(db.assignments.id == assignment_id).delete()

    if ct == 1:
        re = json.dumps("Success")
    else:
        re = json.dumps("Error")
    return re


#
# This is only called by the create button in the popup where you give the assignment
# its initial name.  We might be able to refactor save_assignment to work in all cases.
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def createAssignment():
    response.headers["content-type"] = "application/json"
    name = ""

    if "name" in request.vars and len(request.vars["name"]) > 0:
        name = request.vars["name"]
    else:
        return json.dumps("ERROR")

    course = auth.user.course_id
    logger.debug("Adding new assignment {} for course: {}".format(name, course))
    name_existsQ = len(
        db((db.assignments.name == name) & (db.assignments.course == course)).select()
    )
    if name_existsQ > 0:
        return json.dumps("EXISTS")

    duplicatesource = request.vars["duplicate"]
    if not duplicatesource:
        try:
            newassignID = db.assignments.insert(
                course=course,
                name=name,
                duedate=datetime.datetime.utcnow() + datetime.timedelta(days=7),
                released=False,
                visible=False,
                from_source=False,
            )
            db.commit()
        except Exception as ex:
            logger.error("ERROR CREATING ASSIGNMENT", ex)
            return json.dumps("ERROR")
    else:
        old_assignment = db(db.assignments.id == int(duplicatesource)).select().first()
        try:
            newassignID = db.assignments.insert(
                course=course,
                name=name,
                points=old_assignment.points,
                threshold_pct=old_assignment.threshold_pct,
                duedate=old_assignment.duedate,
                allow_self_autograde=old_assignment.allow_self_autograde,
                visible=old_assignment.visible,
                enforce_due=old_assignment.enforce_due,
                is_timed=old_assignment.is_timed,
                time_limit=old_assignment.time_limit,
                nofeedback=old_assignment.nofeedback,
                nopause=old_assignment.nopause,
                description=old_assignment.description,
                kind=old_assignment.kind,
            )
            old_questions = db(
                db.assignment_questions.assignment_id == old_assignment.id
            ).select()
            for q in old_questions:
                dq = q.as_dict()
                dq["assignment_id"] = newassignID
                del dq["id"]
                db.assignment_questions.insert(**dq)
            db.commit()
        except Exception as ex:
            logger.error("ERROR DUPLICATING ASSIGNMENT", ex)
            return json.dumps("ERROR")

    returndict = {name: newassignID}
    return json.dumps(returndict)


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def renameAssignment():
    response.headers["content-type"] = "application/json"
    try:
        logger.debug(
            "Renaming {} to {} for course {}.".format(
                request.vars["original"], request.vars["name"], auth.user.course_id
            )
        )
        assignment_id = request.vars["original"]
        name = request.vars["name"]
        course = auth.user.course_id
        name_existsQ = len(
            db(
                (db.assignments.name == name) & (db.assignments.course == course)
            ).select()
        )
        if name_existsQ > 0:
            return json.dumps("EXISTS")
        db(db.assignments.id == assignment_id).update(name=name)
    except Exception as ex:
        logger.error(ex)
        return json.dumps("ERROR")
    try:
        returndict = {name: assignment_id}
        return json.dumps(returndict)
    except Exception as ex:
        logger.error(ex)
        return json.dumps("ERROR")


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def questionBank():
    """called by the questionBank function in admin.js
    Unpack all of the search criteria and then query the questions table
    to find matching questions.

    Returns:
        JSON: A list of questions that match the search criteria
    """
    response.headers["Content-Type"] = "application/json"

    row = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.course_name, db.courses.base_course)
        .first()
    )
    base_course = row.base_course
    query_clauses = []

    # should we search the question by term?
    term_list = []
    if request.vars.term:
        term_list = [x.strip() for x in request.vars.term.split()]

    # this will not be perfect but is an ok start.
    if request.vars["language"] != "python" and request.vars["language"] != "any":
        term_list.append(f':language: {request.vars["language"]}')

    if term_list:
        query_clauses.append(db.questions.question.contains(term_list, all=True))

    if request.vars["chapter"]:
        chapter_label = (
            db(db.chapters.chapter_label == request.vars["chapter"])
            .select(db.chapters.chapter_label)
            .first()
            .chapter_label
        )
        chapterQ = db.questions.chapter == chapter_label
        query_clauses.append(chapterQ)

    if request.vars.min_difficulty:
        query_clauses.append(
            db.questions.difficulty > float(request.vars.min_difficulty)
        )
    if request.vars.max_difficulty:
        query_clauses.append(
            db.questions.difficulty < float(request.vars.max_difficulty)
        )

    if request.vars["author"]:
        query_clauses.append(db.questions.author == request.vars["author"])

    if request.vars["constrainbc"] == "true":
        query_clauses.append(db.questions.base_course == base_course)

    my_name = f"{auth.user.first_name} {auth.user.last_name}"
    privacy_clause = (db.questions.is_private == False) | (
        db.questions.author == my_name
    )
    query_clauses.append(privacy_clause)

    is_join = False
    if request.vars.competency:
        is_join = True
        comp_clause = (db.competency.competency == request.vars.competency) & (
            db.competency.question == db.questions.id
        )
        if request.vars.isprim == "true":
            comp_clause = comp_clause & (db.competency.is_primary == True)

        query_clauses.append(comp_clause)

    myquery = query_clauses[0]
    for clause in query_clauses[1:]:
        myquery = myquery & clause

    rows = db(myquery).select()

    questions = []
    for q_row in rows:
        if is_join:
            questions.append((q_row.questions.name, q_row.questions.id))
        else:
            questions.append((q_row.name, q_row.id))

    return json.dumps(questions)


# Deprecated; use add__or_update_assignment_question instead
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def addToAssignment():
    return add__or_update_assignment_question()


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def getQuestionInfo():
    """
    called by the questionBank search  interface
    Request Vars required:
    * assignment -- integer assignment id
    * question -- the name of the question
    """
    question_name = request.vars["question"]
    constrainbc = request.vars.constrainbc

    base_course = (
        db(db.courses.course_name == auth.user.course_name).select().first().base_course
    )
    query = db.questions.name == question_name
    if constrainbc == "true":
        query = query & (db.questions.base_course == base_course)

    row = db(query).select().first()

    if row:
        question_code = row.question
        htmlsrc = row.htmlsrc
        question_author = row.author
        question_difficulty = row.difficulty
        question_id = row.id
    else:
        return json.dumps({})

    tags = []
    question_tags = db((db.question_tags.question_id == question_id)).select()
    for row in question_tags:
        tag_id = row.tag_id
        tag_name = db((db.tags.id == tag_id)).select(db.tags.tag_name).first().tag_name
        tags.append(" " + str(tag_name))
    if question_difficulty is not None:
        returnDict = {
            "code": question_code,
            "htmlsrc": htmlsrc,
            "author": question_author,
            "difficulty": int(question_difficulty),
            "tags": tags,
        }
    else:
        returnDict = {
            "code": question_code,
            "htmlsrc": htmlsrc,
            "author": question_author,
            "difficulty": None,
            "tags": tags,
        }

    return json.dumps(returnDict)


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def edit_question():
    """
    Called to save an updated version of an existing question
    1. Can only be updated by the original author
    """
    vars = request.vars
    old_qname = vars["question"]
    new_qname = vars["name"]
    try:
        difficulty = int(vars["difficulty"])
    except Exception:
        difficulty = 0
    tags = vars["tags"]
    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    old_question = (
        db((db.questions.name == old_qname) & (db.questions.base_course == base_course))
        .select()
        .first()
    )

    if not old_question:
        return json.dumps("Could not find question {} to update".format(old_qname))

    author = auth.user.first_name + " " + auth.user.last_name
    owner = auth.user.username
    timestamp = datetime.datetime.utcnow()
    chapter = old_question.chapter
    question_type = old_question.question_type
    subchapter = old_question.subchapter

    question = vars["questiontext"]
    htmlsrc = base64.b64decode(vars["htmlsrc"]).decode("utf-8")
    private = True if vars["isprivate"] == "true" else False
    print("PRIVATE = ", private)

    if (
        old_qname == new_qname
        and old_question.owner != owner
        and not is_editor(auth.user.id)
    ):
        return json.dumps(
            "You do not own this question and are not an editor. Please assign a new unique id"
        )

    if old_qname != new_qname:
        newq = (
            db(
                (db.questions.name == new_qname)
                & (db.questions.base_course == base_course)
            )
            .select()
            .first()
        )
        if newq and newq.author.lower() != author.lower():
            return json.dumps(
                "Name taken, you cannot replace a question you did not author"
            )

    autograde = ""
    if re.search(r":autograde:\s+unittest", question):
        autograde = "unittest"
    practice = ""
    topic = None
    if re.search(r":practice:\s+T", question):
        practice = "T"
        topic = "{}/{}".format(chapter, subchapter)

    try:
        new_qid = db.questions.update_or_insert(
            (db.questions.name == new_qname)
            & (db.questions.base_course == base_course),
            difficulty=difficulty,
            question=question,
            name=new_qname,
            author=author,
            owner=owner,
            base_course=base_course,
            timestamp=timestamp,
            chapter=chapter,
            subchapter=subchapter,
            question_type=question_type,
            htmlsrc=htmlsrc,
            autograde=autograde,
            practice=practice,
            is_private=private,
            topic=topic,
            from_source=False,
        )
        if tags and tags != "null":
            tags = tags.split(",")
            for tag in tags:
                logger.error("TAG = %s", tag)
                tag_id = db(db.tags.tag_name == tag).select(db.tags.id).first().id
                db.question_tags.insert(question_id=new_qid, tag_id=tag_id)
        return json.dumps("Success - Edited Question Saved")
    except Exception as ex:
        logger.error(ex)
        return json.dumps("An error occurred saving your question {}".format(str(ex)))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def question_text():
    qname = request.vars.question_name
    constrainbc = request.vars.constrainbc
    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    query = db.questions.name == qname
    is_private = False
    q_text = None
    if constrainbc == "true":
        query = query & (db.questions.base_course == base_course)
    try:
        res = db(query).select(db.questions.question, db.questions.is_private).first()
        q_text = res.question
        is_private = res.is_private == True
    except Exception as e:
        q_text = f"Error: Could not find source for {qname} in the database"
        logger.error(f"Error finding source for {qname} in the database: {e}")
    if q_text == None:
        q_text = f"Error: Could not find source for {qname} in the database"

    logger.debug(q_text)
    logger.debug(f"is_private = {is_private}")
    return json.dumps({"question_text": q_text, "is_private": is_private})


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def gettemplate():
    template = request.args[0]
    returndict = {}
    base = ""

    returndict["template"] = base + cmap.get(template, "").__doc__

    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    chapters = []
    chaptersrow = db(db.chapters.course_id == base_course).select(
        db.chapters.chapter_name, db.chapters.chapter_label
    )
    for row in chaptersrow:
        chapters.append((row["chapter_label"], row["chapter_name"]))
    logger.debug(chapters)
    returndict["chapters"] = chapters

    return json.dumps(returndict)


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def createquestion():
    """
    called from the questionBank interface when an instructor adds a new question to
    an assignment by writing it themselves
    request.vars parameters include
    * template - The kind  of question
    * name - the unique identifier
    * question - rst source for the question
    * difficulty 0-5
    * tags
    * chapter
    * subchapter  'Exercises' by default
    * isprivate is this question shared with everyone?
    * tab
    * assignmentid': assignmentid
    * points integer number of points
    * timed- is this part of a timed exam
    * htmlsrc htmlsrc from the previewer -- encoded as base64
    """
    row = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.course_name, db.courses.base_course)
        .first()
    )
    base_course = row.base_course
    aid = request.vars["assignmentid"]
    if aid == "undefined":
        logger.error(
            "undefined assignmentid by {} for name {} subchap {} question {}".format(
                auth.user.username,
                request.vars.name,
                request.vars.subchapter,
                request.vars.question,
            )
        )
        return json.dumps("ERROR")

    assignmentid = int(aid)
    points = int(request.vars["points"]) if request.vars["points"] else 1
    timed = request.vars["timed"]
    unittest = None
    practice = False
    topic = None
    if re.search(r":autograde:\s+unittest", request.vars.question):
        unittest = "unittest"
    if re.search(r":practice:\s+T", request.vars.question):
        practice = True
        topic = "{}/{}".format(request.vars.chapter, request.vars.subchapter)

    question_type = request.vars["template"]
    g = re.search(r"^\s*.. (\w+)::", request.vars.question)
    if g:
        question_type = g.group(1)
        if question_type != request.vars["template"]:
            logger.error(f"question mismatch for question type {question_type}")

    try:
        # htmlsrc should be sent as base64 encoded to avoid XSS attacks
        source = base64.b64decode(request.vars["htmlsrc"]).decode("utf-8")
        newqID = db.questions.insert(
            base_course=base_course,
            name=request.vars["name"].strip(),
            chapter=request.vars["chapter"],
            subchapter=request.vars["subchapter"],
            author=auth.user.first_name + " " + auth.user.last_name,
            autograde=unittest,
            difficulty=request.vars["difficulty"],
            question=request.vars["question"],
            timestamp=datetime.datetime.utcnow(),
            question_type=question_type,
            is_private=request.vars["isprivate"],
            practice=practice,
            from_source=False,
            topic=topic,
            htmlsrc=source,
        )

        if request.vars["template"] == "datafile":
            # datafiles are not questions, but we would like instructors to be able
            # to add their own datafiles for projects or exercises. So we store
            # the datafile contents in the database instead of adding a question
            # to the assignment.
            divid = request.vars["name"].strip()
            q = request.vars["question"].lstrip()
            q = q.split("\n")
            first_blank = q.index("")
            q = "\n".join([x.lstrip() for x in q[first_blank + 1 :]])
            db.source_code.update_or_insert(
                (db.source_code.acid == divid)
                & (db.source_code.course_id == base_course),
                main_code=q,
                course_id=base_course,
                acid=divid,
            )
        else:
            max_sort = (
                db(db.assignment_questions.assignment_id == assignmentid)
                .select(
                    db.assignment_questions.sorting_priority,
                    orderby=~db.assignment_questions.sorting_priority,
                )
                .first()
            )
            if max_sort:
                max_sort = max_sort.sorting_priority + 1
            else:
                max_sort = 0
            db.assignment_questions.insert(
                assignment_id=assignmentid,
                question_id=newqID,
                timed=timed,
                points=points,
                autograde=unittest or "pct_correct",
                which_to_grade="best_answer",
                sorting_priority=max_sort,
            )

        returndict = {request.vars["name"]: newqID, "timed": timed, "points": points}

        return json.dumps(returndict)
    except Exception as ex:
        logger.error(ex)
        return json.dumps("ERROR")


# @auth.requires(
#     lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
#     requires_login=True,
# )
# replacing the above to allow any logged in account to access getToggleSrc and preview function
@auth.requires_login()
def htmlsrc():
    """
    Get the html source for a question.  If just the divid is included then assume that
    the question must come from the current base course.  If an assignment_id is provided
    then that question could come from any base course and so make sure it is part of the
    current assignment_questions set.
    """
    acid = request.vars["acid"]
    assignment_id = request.vars.assignmentId
    studentId = request.vars.sid
    htmlsrc = ""
    if assignment_id:
        logger.debug(f"assignment_id = {assignment_id}")
        res = (
            db(
                (db.questions.name == acid)
                & (db.assignment_questions.question_id == db.questions.id)
                & (db.assignment_questions.assignment_id == assignment_id)
            )
            .select(db.questions.htmlsrc, db.questions.question_type)
            .first()
        )
    else:
        res = (
            db(
                (db.questions.name == acid)
                & (db.questions.base_course == db.courses.base_course)
                & (db.courses.course_name == auth.user.course_name)
            )
            .select(db.questions.htmlsrc, db.questions.question_type)
            .first()
        )
    if res and (res.htmlsrc or res.question_type == "selectquestion"):
        if res.question_type == "selectquestion" and studentId:
            # Check the selected_questions table to see which actual question was chosen
            # then get that question.
            realq = (
                db(
                    (db.selected_questions.selector_id == acid)
                    & (db.selected_questions.sid == studentId)
                    & (db.selected_questions.selected_id == db.questions.name)
                )
                .select(db.questions.htmlsrc)
                .first()
            )
            if realq:
                htmlsrc = realq.htmlsrc
        else:
            htmlsrc = res.htmlsrc
    else:
        if res and res.question_type != "page":
            logger.error(
                "HTML Source not found for %s in course %s", acid, auth.user.course_name
            )
        htmlsrc = "<p>No preview available</p>"
    if (
        htmlsrc and htmlsrc[0:2] == "\\x"
    ):  # Workaround Python3/Python2  SQLAlchemy/DAL incompatibility with text columns
        htmlsrc = htmlsrc.decode("hex")

    result = {"htmlsrc": htmlsrc}
    logger.debug("htmlsrc = {htmlsrc}")
    if "data-attachment" in htmlsrc:
        # get the URL for the attachment, but we need the course, the user and the divid
        session = boto3.session.Session()
        client = session.client(
            "s3",
            config=botocore.config.Config(s3={"addressing_style": "virtual"}),
            region_name=settings.region,
            endpoint_url="https://nyc3.digitaloceanspaces.com",
            aws_access_key_id=settings.spaces_key,
            aws_secret_access_key=settings.spaces_secret,
        )

        prepath = f"{auth.user.course_name}/{acid}/{studentId}"
        logger.debug(f"checking path {prepath}")
        response = client.list_objects(Bucket=settings.bucket, Prefix=prepath)
        logger.debug(f"response = {response}")
        if response and "Contents" in response:
            if len(response["Contents"]) == 0:
                logger.debug(f"No attachments found for {prepath}")
                url = ""
            elif len(response["Contents"]) > 1:
                # sort by last modified date
                response["Contents"].sort(
                    key=lambda x: x["LastModified"], reverse=True
                )
            obj = response["Contents"][0]
            logger.debug("key = {obj['Key']}")
            url = client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": settings.bucket, "Key": obj["Key"]},
                ExpiresIn=300,
            )

        else:
            url = ""
        result["attach_url"] = url
    return json.dumps(result)


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def getGradeComments():
    acid = request.vars["acid"]
    sid = request.vars["sid"]

    c = (
        db(
            (db.question_grades.sid == sid)
            & (db.question_grades.div_id == acid)
            & (db.question_grades.course_name == auth.user.course_name)
        )
        .select()
        .first()
    )
    if c is not None:
        return json.dumps({"grade": c.score, "comments": c.comment})
    else:
        return json.dumps("Error")


def _get_lti_record(oauth_consumer_key):
    if oauth_consumer_key:
        return db(db.lti_keys.consumer == oauth_consumer_key).select().first()


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def releasegrades():
    try:
        assignmentid = request.vars["assignmentid"]
        released = request.vars["released"] == "yes"
        assignment = db(db.assignments.id == assignmentid).select().first()
        assignment.update_record(released=released)

    except Exception as ex:
        logger.error(ex)
        return "ERROR"

    # this is now redundant as we send lti as we grade
    if released:
        # send lti grades
        lti_method = asyncio.get_event_loop().run_until_complete(
            fetch_lti_version(auth.user.course_id)
        )
        if lti_method == "1.3":
            # need force... released still somehow shows as false in DB
            asyncio.get_event_loop().run_until_complete(
                attempt_lti1p3_score_updates(int(assignmentid), force=True)
            )
        if lti_method == "1.1":
            assignment = _get_assignment(assignmentid)
            lti_record = _get_lti_record(session.oauth_consumer_key)
            if assignment and lti_record:
                send_lti_grades(
                    assignment.id,
                    assignment.points,
                    auth.user.course_id,
                    lti_record,
                    db,
                )
    return "Success"


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def push_lti_grades():
    assignmentid = request.vars["assignmentid"]
    print(
        f"push_lti_grades: assignmentid={assignmentid}, course_id={auth.user.course_id}"
    )
    # send lti grades
    lti_method = asyncio.get_event_loop().run_until_complete(
        fetch_lti_version(auth.user.course_id)
    )
    if lti_method == "1.3":
        asyncio.get_event_loop().run_until_complete(
            attempt_lti1p3_score_updates(int(assignmentid), force=True)
        )
    if lti_method == "1.1":
        assignment = _get_assignment(assignmentid)
        lti_record = _get_lti_record(session.oauth_consumer_key)
        if assignment and lti_record:
            send_lti_grades(
                assignment.id, assignment.points, auth.user.course_id, lti_record, db
            )
    return "Grades submitted to LTI tool"


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def get_assignment_release_states():
    # return a dictionary with the release status of whether grades have been
    # released for each of the assignments for the current course
    try:
        assignments_query = db(db.assignments.course == auth.user.course_id).select()
        return json.dumps({row.name: row.released for row in assignments_query})
    except Exception as ex:
        print(ex)
        return json.dumps({})


# Called to assemble the list of questions for the assignment builder
#
def _get_toc_and_questions(practice=False):
    # return a dictionary with a nested dictionary representing everything the
    # picker will need in the instructor's assignment authoring tab

    # Format is documented at https://www.jstree.com/docs/json/

    # try:
    course_row = get_course_row()
    base_course = course_row.base_course

    # First get the chapters associated with the current course, and insert them into the tree
    # Recurse, with each chapter:
    #   -- get the subchapters associated with it, and insert into the subdictionary
    #   -- Recurse; with each subchapter:
    #      -- get the divs associated with it, and insert into the sub-sub-dictionary

    question_picker = []
    # This one doesn't include the questions, but otherwise the same
    reading_picker = []
    # This one is similar to reading_picker, but does not include sub-chapters with no practice question.
    practice_picker = []
    if practice:
        subchapters_taught_query = db(
            (db.sub_chapter_taught.course_name == auth.user.course_name)
            & (db.chapters.course_id == base_course)
            & (db.chapters.chapter_label == db.sub_chapter_taught.chapter_label)
            & (db.sub_chapters.chapter_id == db.chapters.id)
            & (
                db.sub_chapters.sub_chapter_label
                == db.sub_chapter_taught.sub_chapter_label
            )
        ).select(db.chapters.chapter_name, db.sub_chapters.sub_chapter_name)
        chapters_and_subchapters_taught = [
            (row.chapters.chapter_name, row.sub_chapters.sub_chapter_name)
            for row in subchapters_taught_query
        ]
        topic_query = db(
            (db.courses.course_name == auth.user.course_name)
            & (db.questions.base_course == db.courses.base_course)
            & (db.questions.practice == True)  # noqa: E712
        ).select(
            db.questions.topic,
            db.questions.chapter,
            db.questions.subchapter,
            orderby=db.questions.id,
        )
        for q in topic_query:
            # We know chapter_name and sub_chapter_name include spaces.
            # So we cannot directly use the labels retrieved from q.topic as chapter_name and
            # sub_chapter_name and we need to query the corresponding chapter_name and sub_chapter_name from the
            # corresponding tables.
            topic_not_found = True
            if q.topic is not None:
                topic_not_found = False
                try:
                    chap, subch = q.topic.split("/")
                except Exception:
                    # a badly formed "topic" for the question; just ignore it
                    logger.info("Bad Topic: {}".format(q.topic))
                    topic_not_found = True
                try:
                    chapter = db(
                        (db.chapters.course_id == base_course)
                        & (db.chapters.chapter_label == chap)
                    ).select()[0]

                    sub_chapter_name = (
                        db(
                            (db.sub_chapters.chapter_id == chapter.id)
                            & (db.sub_chapters.sub_chapter_label == subch)
                        )
                        .select()[0]
                        .sub_chapter_name
                    )
                except Exception:
                    # topic's chapter and subchapter are not in the book; ignore this topic
                    logger.info(
                        "Missing Chapter {} or Subchapter {} for topic {}".format(
                            chap, subch, q.topic
                        )
                    )
                    topic_not_found = True

            if topic_not_found:
                topic_not_found = False
                chap = q.chapter
                subch = q.subchapter
                try:
                    chapter = db(
                        (db.chapters.course_id == base_course)
                        & (db.chapters.chapter_label == chap)
                    ).select()[0]

                    sub_chapter_name = (
                        db(
                            (db.sub_chapters.chapter_id == chapter.id)
                            & (db.sub_chapters.sub_chapter_label == subch)
                        )
                        .select()[0]
                        .sub_chapter_name
                    )
                except Exception:
                    # topic's chapter and subchapter are not in the book; ignore this topic
                    logger.info(
                        "Missing Chapter {} or Subchapter {}".format(chap, subch)
                    )
                    topic_not_found = True

            if not topic_not_found:
                chapter_name = chapter.chapter_name
                # Find the item in practice picker for this chapter
                p_ch_info = None
                for ch_info in practice_picker:
                    if ch_info["text"] == chapter_name:
                        p_ch_info = ch_info
                if not p_ch_info:
                    # if there isn't one, add one
                    p_ch_info = {}
                    practice_picker.append(p_ch_info)
                    p_ch_info["text"] = chapter_name
                    p_ch_info["children"] = []
                # add the subchapter
                p_sub_ch_info = {}
                if sub_chapter_name not in [
                    child["text"] for child in p_ch_info["children"]
                ]:
                    p_ch_info["children"].append(p_sub_ch_info)
                    p_sub_ch_info["id"] = "{}/{}".format(chapter_name, sub_chapter_name)
                    p_sub_ch_info["text"] = sub_chapter_name
                    # checked if
                    p_sub_ch_info["state"] = {
                        "checked": (chapter_name, sub_chapter_name)
                        in chapters_and_subchapters_taught
                    }

    # chapters are associated base_course.
    chapters_query = db((db.chapters.course_id == base_course)).select(
        orderby=db.chapters.chapter_num
    )
    ids = {row.chapter_name: row.chapter_num for row in chapters_query}
    practice_picker.sort(key=lambda d: ids[d["text"]])

    for ch in chapters_query:
        q_ch_info = {}
        question_picker.append(q_ch_info)
        q_ch_info["text"] = ch.chapter_name
        q_ch_info["children"] = []
        # Copy the same stuff for reading picker.
        r_ch_info = {}
        reading_picker.append(r_ch_info)
        r_ch_info["text"] = ch.chapter_name
        r_ch_info["children"] = []
        # practice_questions = db((db.questions.chapter == ch.chapter_label) & \
        #                         (db.questions.practice == True))
        # if not practice_questions.isempty():
        #     # Copy the same stuff for practice picker.
        #     p_ch_info = {}
        #     practice_picker.append(p_ch_info)
        #     p_ch_info['text'] = ch.chapter_name
        #     p_ch_info['children'] = []
        # todo:  check the chapters attribute to see if its available for readings
        subchapters_query = db(db.sub_chapters.chapter_id == ch.id).select(
            orderby=[db.sub_chapters.sub_chapter_num, db.sub_chapters.sub_chapter_name]
        )
        for sub_ch in subchapters_query:
            q_sub_ch_info = {}
            q_ch_info["children"].append(q_sub_ch_info)
            q_sub_ch_info["text"] = sub_ch.sub_chapter_name
            # Make the Exercises sub-chapters easy to access, since user-written problems will be added there.
            if sub_ch.sub_chapter_name == "Exercises":
                q_sub_ch_info["id"] = ch.chapter_name + " Exercises"
            q_sub_ch_info["children"] = []
            # Copy the same stuff for reading picker.
            if (
                sub_ch.skipreading == "F"
                or sub_ch.skipreading == False  # noqa: E712
                or sub_ch.skipreading == None
            ):
                r_sub_ch_info = {}
                r_ch_info["children"].append(r_sub_ch_info)
                r_sub_ch_info["id"] = "{}/{}".format(
                    ch.chapter_name, sub_ch.sub_chapter_name
                )
                r_sub_ch_info["text"] = sub_ch.sub_chapter_name

            author = auth.user.first_name + " " + auth.user.last_name
            # TODO:  add a check for showing from_source == True books
            # TODO: add a better sorting mechanism.
            questions_query = db(
                (db.courses.course_name == auth.user.course_name)
                & (db.questions.base_course == db.courses.base_course)
                & (db.questions.chapter == ch.chapter_label)
                & (db.questions.question_type != "page")
                & (db.questions.subchapter == sub_ch.sub_chapter_label)
                & ((db.questions.author == author) | (db.questions.is_private == "F"))
                & (
                    (db.questions.review_flag == "F")
                    | (db.questions.review_flag == None)  # noqa: E711
                )
            ).select(orderby=~db.questions.from_source | db.questions.id)
            for question in questions_query:
                if question.questions.qnumber:
                    qlabel = question.questions.qnumber
                else:
                    qlabel = question.questions.name
                q_info = dict(
                    text=qlabel + _add_q_meta_info(question),
                    id=question.questions.name,
                )
                q_sub_ch_info["children"].append(q_info)
    return json.dumps(
        {
            "reading_picker": reading_picker,
            "practice_picker": practice_picker,
            "question_picker": question_picker,
        }
    )


# This is the place to add meta information about questions for the
# assignment builder
# TODO: Incorporate which_to_grade stuff in here.
def _add_q_meta_info(qrow):
    qt = {
        "mchoice": "Mchoice ✓",
        "clickablearea": "Clickable ✓",
        "youtube": "Video",
        "activecode": "ActiveCode",
        "poll": "Poll",
        "showeval": "ShowEval",
        "video": "Video",
        "dragndrop": "Matching ✓",
        "parsonsprob": "Parsons ✓",
        "codelens": "CodeLens",
        "lp_build": "LP ✓",
        "shortanswer": "ShortAns",
        "actex": "ActiveCode",
        "fillintheblank": "FillB ✓",
        "quizly": "Quizly ✓",
        "khanex": "KhanAcademy ✓",
        "webwork": "WebWork ✓",
        "hparsons": "MicroParsons ✓",
    }
    qt = qt.get(qrow.questions.question_type, "")

    if qrow.questions.autograde:
        ag = " ✓"
    else:
        ag = ""

    if qrow.questions.from_source:
        book = "📘"
    else:
        book = "🏫"

    if qrow.questions.is_private == True:
        private = "🔒"
    else:
        private = ""

    name = qrow.questions.name

    res = """ <span style="color: green">[{} {} {} {}
        </span> <span style="color: mediumblue">({})</span>]
        <span>{}...</span>""".format(
        book, qt, ag, private, name, qrow.questions.description
    )

    return res

def _get_assignment_kind(assignment):
    """
    Returns the kind of assignment, based on the assignment's `from_source` field.
    """
    if assignment.is_timed == 'T':
        return "Timed"
    elif assignment.is_peer == 'T':
        return "Peer"
    else:
        return "Regular"
    
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def get_assignment():
    """
    Called when an assignment is chosen on the assignment builder page
    """
    logger.debug(f"in get_assignment {request.vars.assignmentid}")
    try:
        assignment_id = int(request.vars.assignmentid)
    except (TypeError, ValueError):
        assignment_row = None
    else:
        assignment_row = db(db.assignments.id == assignment_id).select().first()
    # Assemble the assignment-level properties
    if not assignment_row:
        logger.error(
            "UNDEFINED assignment {} {} {}".format(
                request.vars.assignmentid, auth.user.course_name, auth.user.username
            )
        )
        session.flash = "Error: assignment ID {} does not exist".format(
            request.vars.assignmentid
        )
        return redirect(URL("assignments", "chooseAssignment.html"))

    _set_assignment_max_points(assignment_id)
    assignment_data = {}
    assignment_data["assignment_points"] = assignment_row.points
    try:
        assignment_data["due_date"] = assignment_row.duedate.strftime("%Y/%m/%d %H:%M")
    except Exception as ex:
        logger.error(ex)
        assignment_data["due_date"] = None
    assignment_data["description"] = assignment_row.description
    assignment_data["visible"] = assignment_row.visible
    assignment_data["grades_released"] = assignment_row.released
    assignment_data["enforce_due"] = assignment_row.enforce_due
    assignment_data["is_timed"] = assignment_row.is_timed
    assignment_data["time_limit"] = assignment_row.time_limit
    assignment_data["from_source"] = assignment_row.from_source
    assignment_data["nofeedback"] = assignment_row.nofeedback
    assignment_data["nopause"] = assignment_row.nopause
    assignment_data["is_peer"] = assignment_row.is_peer
    assignment_data["peer_async_visible"] = assignment_row.peer_async_visible
    assignment_data["kind"] = _get_assignment_kind(assignment_row)
    
    # Still need to get:
    #  -- timed properties of assignment
    #  (See https://github.com/RunestoneInteractive/RunestoneServer/issues/930)
    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    # Assemble the readings (subchapters) that are part of the assignment
    a_q_rows = db(
        (db.assignment_questions.assignment_id == assignment_id)
        & (db.assignment_questions.question_id == db.questions.id)
        & (db.questions.question_type == "page")
    ).select(orderby=db.assignment_questions.sorting_priority)
    pages_data = []
    for row in a_q_rows:
        if row.questions.question_type == "page":
            # get the count of 'things to do' in this chap/subchap
            logger.debug(
                f"chapter = {row.questions.chapter} subchapter = {row.questions.subchapter}"
            )
            activity_count = db(
                (db.questions.chapter == row.questions.chapter)
                & (db.questions.subchapter == row.questions.subchapter)
                & (db.questions.from_source == "T")
                & (
                    (db.questions.optional == False) | (db.questions.optional == None)
                )  # noqa #711
                & (db.questions.base_course == base_course)
            ).count()
            logger.debug(f"activity_count = {activity_count}")
        pages_data.append(
            dict(
                name=row.questions.name,
                points=row.assignment_questions.points,
                autograde=row.assignment_questions.autograde,
                activity_count=activity_count,
                activities_required=row.assignment_questions.activities_required,
                which_to_grade=row.assignment_questions.which_to_grade,
                autograde_possible_values=AUTOGRADE_POSSIBLE_VALUES[
                    row.questions.question_type
                ],
                which_to_grade_possible_values=WHICH_TO_GRADE_POSSIBLE_VALUES[
                    row.questions.question_type
                ],
            )
        )

    # Assemble the questions that are part of the assignment
    a_q_rows = db(
        (db.assignment_questions.assignment_id == assignment_id)
        & (db.assignment_questions.question_id == db.questions.id)
        & (
            (db.assignment_questions.reading_assignment == None)
            | (db.assignment_questions.reading_assignment == "F")
        )  # noqa: E711
    ).select(orderby=db.assignment_questions.sorting_priority)
    # return json.dumps(db._lastsql)
    questions_data = []
    for row in a_q_rows:
        logger.debug(row.questions.question_type)
        if row.questions.question_type != "page":
            questions_data.append(
                dict(
                    name=row.questions.name,
                    points=row.assignment_questions.points,
                    autograde=row.assignment_questions.autograde,
                    which_to_grade=row.assignment_questions.which_to_grade,
                    autograde_possible_values=AUTOGRADE_POSSIBLE_VALUES[
                        row.questions.question_type
                    ],
                    which_to_grade_possible_values=WHICH_TO_GRADE_POSSIBLE_VALUES[
                        row.questions.question_type
                    ],
                )
            )

    return json.dumps(
        dict(
            assignment_data=assignment_data,
            pages_data=pages_data,
            questions_data=questions_data,
        )
    )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def save_assignment():
    # This endpoint is for saving (updating) an assignment's top-level information, without any
    # questions or readings that might be part of the assignment
    # Should return the id of the assignment, if one is not passed in

    # The following fields must be provided in request.vars (see modesl/grouped_assignments.py for model definition):
    # -- assignment_id (if it's an existing assignment; if none provided, then we insert a new assignment)
    # -- description
    # -- duedate

    assignment_id = request.vars.get("assignment_id")
    isVisible = request.vars["visible"]
    gradesReleased = request.vars["grades_released"]
    isEnforced = request.vars["enforce_due"]
    is_timed = request.vars["is_timed"]
    time_limit = request.vars["timelimit"]
    nofeedback = request.vars["nofeedback"]
    nopause = request.vars["nopause"]
    is_peer = request.vars["is_peer"]
    peer_async_visible = request.vars["peer_async_visible"]
    kind = "Regular"
    if is_peer == "T":
        kind = "Peer"
    elif is_timed == "T":
        kind = "Timed"
    try:
        d_str = request.vars["due"]
        format_str = "%Y/%m/%d %H:%M"
        due = datetime.datetime.strptime(d_str, format_str)
        # todo:  add timezone support - due is in the browsers local timezone we want to store in utc

    except Exception:
        logger.error("Bad Date format for assignment: {}".format(d_str))
        due = datetime.datetime.utcnow() + datetime.timedelta(7)
    try:
        total = _set_assignment_max_points(assignment_id)
        # do not update the course in case the user switched courses in another tab
        db(db.assignments.id == assignment_id).update(
            description=request.vars["description"],
            points=total,
            duedate=due,
            is_timed=is_timed,
            visible=isVisible,
            released=gradesReleased,
            enforce_due=isEnforced,
            time_limit=time_limit,
            nofeedback=nofeedback,
            nopause=nopause,
            is_peer=is_peer,
            current_index=0,
            peer_async_visible=peer_async_visible,
            kind=kind,
        )
        return json.dumps({request.vars["name"]: assignment_id, "status": "success"})
    except Exception as ex:
        logger.error(ex)
        return json.dumps("ERROR")


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def add__or_update_assignment_question():
    # This endpoint is for adding a question to an assignment, or updating an existing assignment_question

    # The following fields should be provided in request.vars:
    # -- assignment (an integer)
    # -- question (the question_name)
    # -- questionid
    # -- points
    # -- autograde
    # -- which_to_grade
    # -- reading_assignment (boolean, true if it's a page to visit rather than a directive to interact with)
    # -- sort_position (optional)
    if request.vars.assignment == "undefined":
        session.flash = (
            "Error: Unable to update assignment in DB. No assignment is selected"
        )
        return redirect(URL("admin", "assignments"))

    assignment_id = int(request.vars["assignment"])
    question_name = request.vars["question"]
    question_id = request.vars.question_id
    if question_id:
        question_id = int(question_id)

    logger.debug(
        "adding or updating assign id {} question_name {}".format(
            assignment_id, question_name
        )
    )
    # This assumes that question will always be in DB already, before an assignment_question is created
    logger.debug("course_id %s", auth.user.course_id)
    if not question_id:
        question_id = _get_question_id(
            question_name, auth.user.course_id, assignment_id=assignment_id
        )
    if question_id is None:
        logger.error(
            "Question Not found for name = {} course = {}".format(
                question_name, auth.user.course_id
            )
        )
        session.flash = "Error: Cannot find question {} in the database".format(
            question_name
        )
        return redirect(URL("admin", "assignments"))

    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    logger.debug("base course %s", base_course)
    question_type = db.questions[question_id].question_type
    chapter = db.questions[question_id].chapter
    subchapter = db.questions[question_id].subchapter
    auto_grade = db.questions[question_id].autograde

    # Get the current sorting priority for a question, if its there.
    # otherwise assign it to the end of the list.
    tmpSp = request.vars["sort_position"]
    if not tmpSp:
        tmpSp = _get_question_sorting_priority(assignment_id, question_id)

    if tmpSp is None:
        tmpSp = _get_max_sorting_priority(assignment_id) or 0
        sp = 1 + tmpSp
    else:
        sp = tmpSp

    activity_count = 0
    if question_type == "page":
        reading_assignment = "T"
        # get the count of 'things to do' in this chap/subchap
        activity_count = db(
            (db.questions.chapter == chapter)
            & (db.questions.subchapter == subchapter)
            & (db.questions.from_source == "T")
            & (
                (db.questions.optional == False)
                | (db.questions.optional == None)  # noqa: E711
            )
            & (db.questions.base_course == base_course)
        ).count()
        try:
            activities_required = int(request.vars.get("activities_required"))
            if activities_required == -1:
                activities_required = max(int(activity_count * 0.8), 1)
        except Exception:
            logger.error("No Activities set for RA %s", question_name)
            activities_required = None

    else:
        reading_assignment = None
        activities_required = None

    # Have to use try/except here instead of request.vars.get in case the points is '',
    # which doesn't convert to int
    try:
        points = int(request.vars["points"])
    except Exception:
        points = activity_count

    # If no autograde type is provided, use ``interact`` as a fallback, since this works for all questions types.
    autograde = request.vars.get("autograde", "interact")
    # Use ``best_answer`` as a safe fallback (see ``WHICH_TO_GRADE_POSSIBLE_VALUES`` in this file. )
    which_to_grade = request.vars.get("which_to_grade", "best_answer")
    # Make sure the defaults are set correctly for activecode Qs
    if (
        question_type in ("activecode", "actex") and auto_grade != "unittest"
    ):  # No unit tests for this question
        if autograde and autograde not in ("manual", "interact"):
            autograde = "manual"
            which_to_grade = ""
    if autograde is None:
        autograde = "pct_correct"
    try:
        # save the assignment_question
        db.assignment_questions.update_or_insert(
            (db.assignment_questions.assignment_id == assignment_id)
            & (db.assignment_questions.question_id == question_id),
            assignment_id=assignment_id,
            question_id=question_id,
            activities_required=activities_required,
            points=points,
            autograde=autograde,
            which_to_grade=which_to_grade,
            reading_assignment=reading_assignment,
            sorting_priority=sp,
        )
        total = _set_assignment_max_points(assignment_id)
        return json.dumps(
            dict(
                total=total,
                activity_count=activity_count,
                activities_required=activities_required,
                autograde_possible_values=AUTOGRADE_POSSIBLE_VALUES[question_type],
                which_to_grade_possible_values=WHICH_TO_GRADE_POSSIBLE_VALUES[
                    question_type
                ],
                status="success",
                question_id=question_name,
                points=points,
                autograde=autograde,
                which_to_grade=which_to_grade,
                assign_type=request.vars.assign_type,
            )
        )
    except Exception as ex:
        logger.error(ex)
        return json.dumps("Error")


# As we move toward a question bank model for questions, this relaxes the
# question belongs to a course idea by first simply searching for the question
# by name.  If there is only one match then no problem.  If there is more than one
# then the base course of the current user should be preferred to ensure
# backward compatibility.
def _get_question_id(question_name, course_id, assignment_id=None):
    # first try to just get the question by name.
    question = db((db.questions.name == question_name)).select(db.questions.id)
    # if there is more than one then use the course_id
    if len(question) > 1:
        # prefer to use the assignment if it is there, but when adding a question by name
        # it will not be in the assignment so this will fail and we fall back to using
        # the course.
        if assignment_id:
            question = (
                db(
                    (db.questions.name == question_name)
                    & (db.questions.id == db.assignment_questions.question_id)
                    & (db.assignment_questions.assignment_id == assignment_id)
                )
                .select(db.questions.id)
                .first()
            )

        if question:
            return int(question.id)

        question = (
            db(
                (db.questions.name == question_name)
                & (db.questions.base_course == db.courses.base_course)
                & (db.courses.id == course_id)
            )
            .select(db.questions.id)
            .first()
        )
    else:
        question = question[0]

    if question:
        return int(question.id)
    else:
        # Hmmm, what should we do if not found?
        return None

    # return int(db((db.questions.name == question_name) &
    #           (db.questions.base_course == db.courses.base_course) &
    #           (db.courses.id == course_id)
    #           ).select(db.questions.id).first().id)


def _get_max_sorting_priority(assignment_id):
    max = db.assignment_questions.sorting_priority.max()
    return (
        db((db.assignment_questions.assignment_id == assignment_id))
        .select(max)
        .first()[max]
    )


def _get_question_sorting_priority(assignment_id, question_id):
    res = (
        db(
            (db.assignment_questions.assignment_id == assignment_id)
            & (db.assignment_questions.question_id == question_id)
        )
        .select(db.assignment_questions.sorting_priority)
        .first()
    )
    if res is not None:
        return res["sorting_priority"]
    else:
        return res


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def delete_assignment_question():
    ## Deletes one assignment_question
    try:
        question_name = request.vars["name"]
        assignment_id = int(request.vars["assignment_id"])
        question_id = _get_question_id(
            question_name, auth.user.course_id, assignment_id=assignment_id
        )
        logger.debug("DELETEING A: %s Q:%s ", assignment_id, question_id)
        db(
            (db.assignment_questions.assignment_id == assignment_id)
            & (db.assignment_questions.question_id == question_id)
        ).delete()
        total = _set_assignment_max_points(assignment_id)
        return json.dumps({"total": total})
    except Exception as ex:
        logger.error(ex)
        return json.dumps("Error")


@auth.requires_membership("editor")
def delete_question():
    qname = request.vars["name"]
    base_course = request.vars["base_course"]

    try:
        db(
            (db.questions.name == qname) & (db.questions.base_course == base_course)
        ).delete()
        return json.dumps({"status": "Success"})
    except Exception as ex:
        logger.error(ex)
        return json.dumps({"status": "Error"})


def _set_assignment_max_points(assignment_id):
    """Called after a change to assignment questions.
    Recalculate the total, save it in the assignment row
    and return it."""
    sum_op = db.assignment_questions.points.sum()
    total = (
        db(db.assignment_questions.assignment_id == assignment_id)
        .select(sum_op)
        .first()[sum_op]
    )
    if total is None:
        total = 0
    db(db.assignments.id == assignment_id).update(points=total)
    return total


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def reorder_assignment_questions():
    """Called when the questions are reordered in the instructor assignments interface.
    request.vars must include:
    -- names: a list of strings for question_names
    -- assignment_id: a database record id

    The names list should be a list of *all* assignment_questions of that type (i.e., all that have the
    boolean reading_assignment flag set to True, or all that have it set to False).
    We will reassign sorting_priorities to all of them.
    """
    question_names = request.vars["names[]"]  # a list of question_names
    assignment_id = int(request.vars["assignment_id"])
    i = 0
    for name in question_names:
        i += 1
        question_id = _get_question_id(
            name, auth.user.course_id, assignment_id=assignment_id
        )
        db(
            (db.assignment_questions.question_id == question_id)
            & (db.assignment_questions.assignment_id == assignment_id)
        ).update(sorting_priority=i)

    return json.dumps("Reordered in DB")


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def copy_assignment():
    """
    vars:
      - oldassignment id or  todo (-1 for all assignments)
      - course
    """

    res = None
    if (
        db(
            (db.courses.course_name == request.vars["course"])
            & (db.courses.base_course == request.vars["course"])
        ).count()
        == 1
    ):
        copy_base_course = True

    if (
        not verifyInstructorStatus(request.vars["course"], auth.user)
        and not copy_base_course
    ):
        return "Error: Not Authorized"
    else:
        if request.vars.oldassignment == "-1":
            assignments = db(
                (db.assignments.course == db.courses.id)
                & (db.courses.course_name == request.vars["course"])
                & (db.assignments.from_source == "F")
            ).select()
            for a in assignments:
                print("A = {}".format(a))
                res = _copy_one_assignment(request.vars["course"], a.assignments["id"])
                if res != "success":
                    break
        else:
            res = _copy_one_assignment(
                request.vars["course"], request.vars["oldassignment"]
            )
    if res is None:
        return "Error: No Assignments to copy"
    else:
        return res


def _copy_one_assignment(course, oldid):
    old_course = db(db.courses.course_name == course).select().first()
    this_course = db(db.courses.course_name == auth.user.course_name).select().first()
    old_assignment = db(db.assignments.id == int(oldid)).select().first()
    due_delta = old_assignment.duedate - datetime.datetime.combine(
        old_course.term_start_date, datetime.time()
    )
    due_date = (
        datetime.datetime.combine(this_course.term_start_date, datetime.time())
        + due_delta
    )
    try:
        newassign_id = db.assignments.insert(
            course=auth.user.course_id,
            name=old_assignment.name,
            duedate=due_date,
            description=old_assignment.description,
            points=old_assignment.points,
            threshold_pct=old_assignment.threshold_pct,
            is_timed=old_assignment.is_timed,
            is_peer=old_assignment.is_peer,
            time_limit=old_assignment.time_limit,
            from_source=old_assignment.from_source,
            nofeedback=old_assignment.nofeedback,
            nopause=old_assignment.nopause,
        )
    except Exception as e:
        return f"failed: {str(e)}"

    old_questions = db(
        db.assignment_questions.assignment_id == old_assignment.id
    ).select()
    for q in old_questions:
        dq = q.as_dict()
        dq["assignment_id"] = newassign_id
        del dq["id"]
        db.assignment_questions.insert(**dq)

    return "success"


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def courselog():
    thecourse = db(db.courses.id == auth.user.course_id).select().first()
    course = auth.user.course_name
    dburl = settings.database_uri.replace("postgres://", "postgresql://")
    if dburl.find("?") > 0:
        dburl = dburl[: dburl.find("?")]
    data = pd.read_sql_query(
        """
    select sid, useinfo.timestamp, event, act, div_id, chapter, subchapter
    from useinfo left outer join questions on div_id = name and questions.base_course = '{}'
    where course_id = '{}'
    order by useinfo.id
    """.format(
            thecourse.base_course, course
        ),
        dburl,
    )
    data = data[~data.sid.str.contains(r"^\d{38,38}@")]

    response.headers["Content-Type"] = "application/vnd.ms-excel"
    response.headers["Content-Disposition"] = (
        "attachment; filename=data_for_{}.csv".format(auth.user.course_name)
    )
    return data.to_csv(na_rep=" ")


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def codelog():
    course = auth.user.course_name
    dburl = settings.database_uri.replace("postgres://", "postgresql://")
    if dburl.find("?") > 0:
        dburl = dburl[: dburl.find("?")]
    data = pd.read_sql_query(
        """
    select * from code where course_id = {}
    """.format(
            auth.user.course_id
        ),
        dburl,
    )
    data = data[~data.sid.str.contains(r"^\d{38,38}@")]

    response.headers["Content-Type"] = "application/vnd.ms-excel"
    response.headers["Content-Disposition"] = (
        "attachment; filename=data_for_{}.csv".format(auth.user.course_name)
    )
    return data.to_csv(na_rep=" ")


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def update_course():
    response.headers["Content-Type"] = "application/json"

    thecourse = db(db.courses.id == auth.user.course_id).select().first()
    if thecourse:
        if "new_date" in request.vars:
            new_date = request.vars["new_date"]
            try:
                new_date = str(parse(new_date).date())
                db(db.courses.id == thecourse.id).update(term_start_date=new_date)
            except ValueError:
                logger.error("Bad Date in update_course {}".format(new_date))
                return json.dumps(dict(status="failed"))
        if "allow_pairs" in request.vars:
            db(db.courses.id == thecourse.id).update(
                allow_pairs=(request.vars["allow_pairs"] == "true")
            )
        if "course_domain_name" in request.vars:
            db(db.courses.id == thecourse.id).update(
                domain_name=request.vars["course_domain_name"]
            )
        if "downloads_enabled" in request.vars:
            print("DOWNLOADS = ", request.vars.enable_downloads)
            db(db.courses.id == thecourse.id).update(
                downloads_enabled=(request.vars["downloads_enabled"] == "true")
            )
        if "enable_compare_me" in request.vars:
            db.course_attributes.update_or_insert(
                (db.course_attributes.course_id == thecourse.id)
                & (db.course_attributes.attr == "enable_compare_me"),
                course_id=thecourse.id,
                attr="enable_compare_me",
                value=request.vars.enable_compare_me,
            )
        if "show_points" in request.vars:
            db.course_attributes.update_or_insert(
                (db.course_attributes.course_id == thecourse.id)
                & (db.course_attributes.attr == "show_points"),
                course_id=thecourse.id,
                attr="show_points",
                value=request.vars.show_points,
            )
        if "groupsize" in request.vars:
            db.course_attributes.update_or_insert(
                (db.course_attributes.course_id == thecourse.id)
                & (db.course_attributes.attr == "groupsize"),
                course_id=thecourse.id,
                attr="groupsize",
                value=request.vars.groupsize,
            )
        if "ignore_lti_dates" in request.vars:
            db.course_attributes.update_or_insert(
                (db.course_attributes.course_id == thecourse.id)
                & (db.course_attributes.attr == "ignore_lti_dates"),
                course_id=thecourse.id,
                attr="ignore_lti_dates",
                value=request.vars.ignore_lti_dates,
            )
        if "no_lti_auto_grade_update" in request.vars:
            db.course_attributes.update_or_insert(
                (db.course_attributes.course_id == thecourse.id)
                & (db.course_attributes.attr == "no_lti_auto_grade_update"),
                course_id=thecourse.id,
                attr="no_lti_auto_grade_update",
                value=request.vars.no_lti_auto_grade_update,
            )
        return json.dumps(dict(status="success"))

    return json.dumps(dict(status="failed"))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def flag_question():
    qname = request.vars["question_name"]

    base_course = (
        db(db.courses.id == auth.user.course_id)
        .select(db.courses.base_course)
        .first()
        .base_course
    )
    db((db.questions.name == qname) & (db.questions.base_course == base_course)).update(
        review_flag="T"
    )

    return json.dumps(dict(status="success"))


@auth.requires_membership("editor")
def clear_flag():
    qname = request.vars["question_name"]
    base_course = request.vars["basecourse"]

    db((db.questions.name == qname) & (db.questions.base_course == base_course)).update(
        review_flag="F"
    )

    return json.dumps(dict(status="success"))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def enroll_students():
    if "students" not in request.vars:
        session.flash = "please choose a CSV file with student data"
        return redirect(URL("admin", "admin"))
    students = request.vars.students
    the_course = db(db.courses.course_name == auth.user.course_name).select().first()
    try:
        # use utf-8-sig because it will work with files from excel that have
        # the byte order marker BOM set as an invisible first character in the file
        strfile = io.TextIOWrapper(students.file, encoding="utf-8-sig")
        logger.debug(type(students.file))
        student_reader = csv.reader(strfile)
        validfile = io.TextIOWrapper(students.file, encoding="utf-8-sig")
        validation_reader = csv.reader(validfile)
    except UnicodeDecodeError:
        session.flash = "Could not decode the CSV file. An Excel export is likely the cause (see the Instructor Guide)"
        return redirect(URL("admin", "admin"))
    except Exception as e:
        session.flash = "please choose a CSV file with student data"
        logger.error(e)
        return redirect(URL("admin", "admin"))
    messages = []
    line = 0
    try:
        for row in validation_reader:
            line += 1
            if len(row) == 6:
                res = _validateUser(
                    row[0], row[4], row[2], row[3], row[1], row[5], line
                )
            else:
                res = [f"Error on line {line} you should have 6 fields"]
            if res:
                messages.extend(res)
    except UnicodeDecodeError:
        session.flash = "Error: bad CSV file. An Excel export is likely the cause (see the Instructor Guide)"
        return redirect(URL("admin", "admin"))

    if messages:
        return dict(
            coursename=auth.user.course_name,
            course_id=auth.user.course_name,
            course=the_course,
            messages=messages,
        )
    counter = 0
    success = True
    students.file.seek(0)  # reset the file pointer for underlying data
    try:
        for row in student_reader:
            logger.debug(f"ROW = {row}")
            if len(row) < 6 or (len(row) > 6 and row[6] != ""):
                raise ValueError("CSV must provide six values for each user")
            # CSV: username, email, fname, lname, password, course_name, db
            # Params: username, password, fname, lname, email, course_name,
            # If there are more than 6 values they are likey empty colums
            # we will ignore them.  If it runs out wrong then there will
            # be some kind of error in the rest of the processing
            if row[0] != "":
                createUser(row[0], row[4], row[2], row[3], row[1], row[5])
                counter += 1
            else:
                logger.error("Skipping empty records in CSV")
    except Exception as e:
        logger.error(e)
        db.rollback()
        counter = 0
        session.flash = "Error creating users: {}".format(e)
        success = False

    if success:
        db.commit()
        session.flash = "created {} new users".format(counter)

    return redirect(URL("admin", "admin"))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def resetpw():
    sid = int(request.vars.sid)
    newpw = request.vars.newpass
    user = db(db.auth_user.id == sid).select().first()
    logger.warning(
        "Attempted password reset for {} by {}".format(
            user.username, auth.user.username
        )
    )
    cl = db(db.user_courses.user_id == user.id).select(db.user_courses.course_id)
    course_list = [row.course_id for row in cl]
    if user.id == auth.user.id:
        res = {"status": "fail", "message": "Sorry you cannot update your own password"}
        return json.dumps(res)
    if user.course_id == auth.user.course_id or (auth.user.course_id in course_list):
        pw = CRYPT(auth.settings.hmac_key)(newpw)[0]
        db(db.auth_user.id == sid).update(password=pw)
        res = {
            "status": "success",
            "message": "Success Reset password for {} {} ({})".format(
                user.first_name, user.last_name, user.username
            ),
        }
    else:
        logger.error("Password reset not authorized for {}".format(user.username))
        res = {"status": "fail", "message": "You are not authorized for this user"}

    return json.dumps(res)


@auth.requires_membership("editor")
def manage_exercises():
    books = db(db.editor_basecourse.editor == auth.user).select()
    the_course = db(db.courses.course_name == auth.user.course_name).select().first()
    qlist = []
    chapinfo = {}
    for book in books:
        questions = db(
            (db.questions.review_flag == "T")
            & (db.questions.base_course == book.base_course)
        ).select(
            db.questions.htmlsrc,
            db.questions.difficulty,
            db.questions.name,
            db.questions.base_course,
            db.questions.chapter,
        )
        for q in questions:
            qlist.append(q)

        chapters = db(db.chapters.course_id == book.base_course).select(
            db.chapters.chapter_name,
            db.chapters.chapter_label,
            db.chapters.course_id,
            orderby=db.chapters.chapter_num,
        )
        chapinfo[book.base_course] = {}
        for chap in chapters:
            chapinfo[book.base_course][chap.chapter_label] = {
                "title": chap.chapter_name,
                "basecourse": book.base_course,
            }

    return dict(
        questioninfo=qlist,
        course=the_course,
        gradingUrl=URL("assignments", "get_problem"),
        autogradingUrl=URL("assignments", "autograde"),
        gradeRecordingUrl=URL("assignments", "record_grade"),
        calcTotalsURL=URL("assignments", "calculate_totals"),
        setTotalURL=URL("assignments", "record_assignment_score"),
        sendLTIGradeURL=URL("assignments", "send_assignment_score_via_LTI"),
        getCourseStudentsURL=URL("admin", "course_students"),
        get_assignment_release_statesURL=URL("admin", "get_assignment_release_states"),
        course_id=auth.user.course_name,
        tags=[],
        chapdict=chapinfo,
    )


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def get_assignment_list():
    course_name = request.vars.course_name
    course = db(db.courses.course_name == course_name).select().first()
    assign_list = db(db.assignments.course == course.id).select(
        db.assignments.id, db.assignments.name, orderby=db.assignments.name
    )
    res = []
    for assign in assign_list:
        res.append({"id": assign.id, "name": assign.name})

    return json.dumps(dict(assignments=res))


# Create LTI Keys
# ---------------
@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def create_lti_keys():
    """
    Generate a consumer and a secret key.  Store them in the database
    and associate this key with the course of the instructor.
    The course_lti_mamp may look a little superflous now, but I think it will grow.
    There is no real magic about the keys so using a UUID seems like just as good
    a solution as anything.

    This API is triggered by the generateLTIKeys() function in admin.js and is
    one panel of the main admin page.

    Returns:
        JSON: A JSON object with the keys
    """
    consumer = auth.user.course_name + "-" + str(uuid.uuid1())
    secret = str(uuid.uuid4())

    ltid = db.lti_keys.insert(consumer=consumer, secret=secret, application="runestone")
    db.course_lti_map.insert(course_id=auth.user.course_id, lti_id=ltid)

    return json.dumps(dict(consumer=consumer, secret=secret))


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def simulate_exam():
    """Simulate the distribution of questions on an exam"""

    # select * from assignment_questions join questions on question_id = questions.id where assignment_id =24;
    assignment_id = request.vars.assignment_id
    questions = db(
        (db.assignment_questions.question_id == db.questions.id)
        & (db.assignment_questions.assignment_id == assignment_id)
    ).select()

    proflist = []
    qsel = {}
    for q in questions:
        m = re.search(r":proficiency:\s+(\w+)", q.questions.question or "")
        if m:
            proflist.append(m.group(1))
        m = re.search(r":fromid:\s+(.*?)\n", q.questions.question or "", re.DOTALL)
        if m:
            qlist = m.group(1).split(",")
            qlist = [x.strip() for x in qlist]
            qsel[q.questions.name] = qlist

    logger.debug(f"proficiency list {proflist}")
    logger.debug(f"questions {qsel}")

    selections = {}
    for i in range(100):
        selections[i] = []
        for comp in proflist:
            q = find_question_for_prof(comp)
            selections[i].append(q)
        for k in qsel:
            selections[i].append(get_id_from_qname(random.choice(qsel[k])))

    logger.debug(f"selected questions = {selections}")

    all_p_profs = []
    all_s_profs = []
    for student in selections:
        for q in selections[student]:
            p_profs, s_profs = get_proficiencies_for_qid(q)
            all_p_profs.extend(p_profs)
            all_s_profs.extend(s_profs)

    pc = Counter(all_p_profs)
    sc = Counter(all_s_profs)
    df1 = pd.DataFrame({"comp": list(pc.keys()), "freq": list(pc.values())})
    df1["kind"] = "primary"
    df2 = pd.DataFrame({"comp": list(sc.keys()), "freq": list(sc.values())})
    df2["kind"] = "secondary"
    df = pd.concat([df1, df2])
    df["exam"] = assignment_id

    bar_order = alt.EncodingSortField(field="freq", op="sum", order="descending")
    c = (
        alt.Chart(df)
        .mark_bar()
        .encode(x="freq", y=alt.Y("comp", sort=bar_order), tooltip="freq", color="kind")
    )
    hmdata = c.to_json()
    tblhtml = df.to_html()

    return dict(
        course_id=auth.user.course_name,
        course=get_course_row(db.courses.ALL),
        hmdata=hmdata,
        tblhtml=tblhtml,
    )


def find_question_for_prof(prof):
    questionlist = []
    res = db(
        (db.competency.competency == prof) & (db.competency.question == db.questions.id)
    ).select(db.questions.id)
    if res:
        questionlist = [row.id for row in res]
        # logger.debug(questionlist)

    return random.choice(questionlist)


def get_id_from_qname(name):
    res = db(db.questions.name == name).select(db.questions.id).first()
    if res:
        logger.debug(res)
        return res.id


def get_proficiencies_for_qid(qid):
    res = db(db.competency.question == qid).select()

    plist = [p.competency for p in res if p.is_primary]
    slist = [p.competency for p in res if not p.is_primary]
    return plist, slist


@auth.requires(
    lambda: verifyInstructorStatus(auth.user.course_id, auth.user),
    requires_login=True,
)
def reset_exam():
    sid = request.vars.student_id
    assignment_name = request.vars.exam_name

    res = db(db.auth_user.id == sid).select().first()
    if res:
        username = res.username
    else:
        return json.dumps({"status": "Failed", "mess": "Unknown Student"})

    num_update = db(
        (db.useinfo.sid == username)
        & (db.useinfo.div_id == assignment_name)
        & (db.useinfo.course_id == auth.user.course_name)
        & (db.useinfo.event == "timedExam")
    ).update(act="start_reset")

    # Remove records from the timed exam table
    num_del = db(
        (db.timed_exam.div_id == assignment_name) & (db.timed_exam.sid == username)
    ).delete()
    if num_del == 0 and num_update == 0:
        return json.dumps(
            {
                "status": "Failed",
                "mess": "Resetting is unnecessary as the exam has not started yet.",
            }
        )

    exam_qs = db(
        (db.assignments.name == assignment_name)
        & (db.assignments.course == auth.user.course_id)
        & (db.assignments.id == db.assignment_questions.assignment_id)
        & (db.questions.id == db.assignment_questions.question_id)
    ).select(db.questions.name)

    for q in exam_qs:
        num = db(
            (db.selected_questions.selector_id == q.name)
            & (db.selected_questions.sid == username)
        ).delete()
        if num > 0:
            logger.debug(f"deleted {q.name} for {username} {num}")

    return json.dumps({"status": "Success", "mess": "Successfully Reset Exam"})


# This displays the table that collects tickets across workers
# for this to work you will need to add a row to ``auth_group`` with the role ``admins``
# In addition any user that you want to have access to these tracebacks will need
# to have their user_id and the group id for admins added to the ``auth_membership`` table.
# This will require some manual sql manipulation.
@auth.requires_membership("admins")
def tickets():
    ticks = db.executesql(
        """
    select * from traceback order by timestamp desc limit 100
    """,
        as_dict=True,
    )
    return dict(tickets=ticks)


def killer():
    print(routes_onerror)
    x = 5 / 0  # noqa: F841
    return "ERROR"
