/*==========================================
=======    Master shortanswer.js    ========
============================================
===     This file contains the JS for    ===
=== the Runestone shortanswer component. ===
============================================
===              Created by              ===
===           Isaiah Mayerchak           ===
===                7/2/15                ===
===              Brad Miller             ===
===                2019                  ===
==========================================*/

import RunestoneBase from "../../common/js/runestonebase.js";
import "./../css/shortanswer.css";

export default class ShortAnswer extends RunestoneBase {
    constructor(opts) {
        super(opts);
        if (opts) {
            var orig = opts.orig; // entire <p> element that will be replaced by new HTML
            this.useRunestoneServices =
                opts.useRunestoneServices || eBookConfig.useRunestoneServices;
            this.origElem = orig;
            this.divid = orig.id;
            this.question = this.origElem.innerHTML;
            this.optional = false;
            this.attachURL = opts.attachURL;
            if ($(this.origElem).is("[data-optional]")) {
                this.optional = true;
            }
            if ($(this.origElem).is("[data-mathjax]")) {
                this.mathjax = true;
            }
            this.mathjax = true;
            if ($(this.origElem).is("[data-attachment]")) {
                this.attachment = true;
            }
            this.placeholder =
                $(this.origElem).data("placeholder") ||
                "Write your answer here";
            this.renderHTML();
            this.caption = "shortanswer";
            this.addCaption("runestone");
            this.checkServer("shortanswer", true);
            if (typeof Prism !== "undefined") {
                Prism.highlightAllUnder(this.containerDiv);
            }
            if (this.attachment) {
                this.getAttachmentName();
            }
        }
    }

    renderHTML() {
        this.containerDiv = document.createElement("div");
        this.containerDiv.id = this.divid;
        $(this.containerDiv).addClass(this.origElem.getAttribute("class"));
        this.newForm = document.createElement("form");
        this.newForm.id = this.divid + "_journal";
        this.newForm.name = this.newForm.id;
        this.newForm.action = "";
        this.containerDiv.appendChild(this.newForm);
        this.fieldSet = document.createElement("fieldset");
        this.newForm.appendChild(this.fieldSet);
        this.firstLegendDiv = document.createElement("div");
        this.firstLegendDiv.innerHTML = this.question;
        $(this.firstLegendDiv).addClass("journal-question");
        this.fieldSet.appendChild(this.firstLegendDiv);
        this.jInputDiv = document.createElement("div");
        this.jInputDiv.id = this.divid + "_journal_input";
        this.fieldSet.appendChild(this.jInputDiv);
        this.jOptionsDiv = document.createElement("div");
        $(this.jOptionsDiv).addClass("journal-options");
        this.jInputDiv.appendChild(this.jOptionsDiv);
        this.jTextArea = document.createElement("textarea");
        let self = this;
        this.jTextArea.onchange = function () {
            self.isAnswered = true;
        };
        this.jTextArea.id = this.divid + "_solution";
        $(this.jTextArea).attr("aria-label", "textarea");
        this.jTextArea.placeholder = this.placeholder;
        $(this.jTextArea).css("display:inline, width:530px");
        $(this.jTextArea).addClass("form-control");
        this.jTextArea.rows = 4;
        this.jTextArea.cols = 50;
        this.jOptionsDiv.appendChild(this.jTextArea);
        this.jTextArea.onchange = function () {
            this.isAnswered = true;
            if (this.isTimed) {
                this.feedbackDiv.innerHTML = "Your answer is automatically saved.";
            } else {
                this.feedbackDiv.innerHTML = "Your answer has not been saved yet!";
            }
            $(this.feedbackDiv).removeClass("alert-success");
            $(this.feedbackDiv).addClass("alert alert-danger");
        }.bind(this);
        this.fieldSet.appendChild(document.createElement("br"));
        if (this.mathjax) {
            this.renderedAnswer = document.createElement("div");
            $(this.renderedAnswer).addClass("latexoutput");
            this.fieldSet.appendChild(this.renderedAnswer);
        }
        this.buttonDiv = document.createElement("div");
        this.fieldSet.appendChild(this.buttonDiv);
        this.submitButton = document.createElement("button");
        $(this.submitButton).addClass("btn btn-success");
        this.submitButton.type = "button";
        this.submitButton.textContent = "Save";
        this.submitButton.onclick = function () {
            this.checkCurrentAnswer();
            this.logCurrentAnswer();
            this.renderFeedback();
        }.bind(this);
        this.buttonDiv.appendChild(this.submitButton);
        this.randomSpan = document.createElement("span");
        this.randomSpan.innerHTML = "Instructor's Feedback";
        this.fieldSet.appendChild(this.randomSpan);
        this.otherOptionsDiv = document.createElement("div");
        $(this.otherOptionsDiv).css("padding-left:20px");
        $(this.otherOptionsDiv).addClass("journal-options");
        this.fieldSet.appendChild(this.otherOptionsDiv);
        // add a feedback div to give user feedback
        this.feedbackDiv = document.createElement("div");
        //$(this.feedbackDiv).addClass("bg-info form-control");
        //$(this.feedbackDiv).css("width:530px, background-color:#eee, font-style:italic");
        $(this.feedbackDiv).css("width:530px, font-style:italic");
        this.feedbackDiv.id = this.divid + "_feedback";
        this.feedbackDiv.innerHTML = "You have not answered this question yet.";
        $(this.feedbackDiv).addClass("alert alert-danger");
        //this.otherOptionsDiv.appendChild(this.feedbackDiv);
        this.fieldSet.appendChild(this.feedbackDiv);
        if (this.attachment) {
            let attachDiv = document.createElement("div")
            this.attachDiv = attachDiv;
            if (this.graderactive) {
                // If in grading mode make a button to create a popup with the image
                let viewButton = document.createElement("button")
                viewButton.type = "button"
                viewButton.innerHTML = "View Attachment"
                viewButton.onclick = this.viewFile.bind(this);
                attachDiv.appendChild(viewButton);
            } else {
                // Otherwise make a button for the student to select a file to upload.
                this.fileUpload = document.createElement("input")
                this.fileUpload.type = "file";
                this.fileUpload.id = `${this.divid}_fileme`;
                attachDiv.appendChild(this.fileUpload);
            }
            this.containerDiv.appendChild(attachDiv);
        }
        //this.fieldSet.appendChild(document.createElement("br"));
        $(this.origElem).replaceWith(this.containerDiv);
        // This is a stopgap measure for when MathJax is not loaded at all.  There is another
        // more difficult case that when MathJax is loaded asynchronously we will get here
        // before MathJax is loaded.  In that case we will need to implement something
        // like `the solution described here <https://stackoverflow.com/questions/3014018/how-to-detect-when-mathjax-is-fully-loaded>`_
        if (typeof MathJax !== "undefined") {
            this.queueMathJax(this.containerDiv);
        }
    }

    renderMath(value) {
        if (this.mathjax) {
            value = value.replace(/\$\$(.*?)\$\$/g, "\\[ $1 \\]");
            value = value.replace(/\$(.*?)\$/g, "\\( $1 \\)");
            value = value.replace(/\n/g, "<br/>"); // add line breaks
            $(this.renderedAnswer).html(value);
            this.queueMathJax(this.renderedAnswer);
        }
    }

    async checkCurrentAnswer() {
        let value = $(document.getElementById(this.divid + "_solution")).val();
        this.renderMath(value);
        this.setLocalStorage({
            answer: value,
            timestamp: new Date(),
        });
    }

    async logCurrentAnswer(sid) {
        let value = $(document.getElementById(this.divid + "_solution")).val();
        this.renderMath(value);
        this.setLocalStorage({
            answer: value,
            timestamp: new Date(),
        });
        let data = {
            event: "shortanswer",
            act: value,
            answer: value,
            div_id: this.divid,
        };
        if (typeof sid !== "undefined") {
            data.sid = sid;
        }
        await this.logBookEvent(data);
        if (this.attachment) {
            await this.uploadFile();
        }
    }

    renderFeedback() {
        this.feedbackDiv.innerHTML = "Your answer has been saved.";
        $(this.feedbackDiv).removeClass("alert-danger");
        $(this.feedbackDiv).addClass("alert alert-success");
    }
    setLocalStorage(data) {
        if (!this.graderactive) {
            let key = this.localStorageKey();
            localStorage.setItem(key, JSON.stringify(data));
        }
    }
    checkLocalStorage() {
        // Repopulates the short answer text
        // which was stored into local storage.
        var answer = "";
        if (this.graderactive) {
            return;
        }
        var len = localStorage.length;
        if (len > 0) {
            var ex = localStorage.getItem(this.localStorageKey());
            if (ex !== null) {
                try {
                    var storedData = JSON.parse(ex);
                    answer = storedData.answer;
                } catch (err) {
                    // error while parsing; likely due to bad value stored in storage
                    console.log(err.message);
                    localStorage.removeItem(this.localStorageKey());
                    return;
                }
                let solution = $("#" + this.divid + "_solution");
                solution.text(answer);
                this.renderMath(answer);
                this.feedbackDiv.innerHTML =
                    "Your current saved answer is shown above.";
                $(this.feedbackDiv).removeClass("alert-danger");
                $(this.feedbackDiv).addClass("alert alert-success");
            }
        }
    }
    restoreAnswers(data) {
        // Restore answers from storage retrieval done in RunestoneBase
        // sometimes data.answer can be null
        if (!data.answer) {
            data.answer = "";
        }
        this.answer = data.answer;
        this.jTextArea.value = this.answer;
        this.renderMath(this.answer);

        let p = document.createElement("p");
        this.jInputDiv.appendChild(p);
        var tsString = "";
        if (data.timestamp) {
            tsString = new Date(data.timestamp).toLocaleString();
        } else {
            tsString = "";
        }
        $(p).text(tsString);
        if (data.last_answer) {
            this.current_answer = "ontime";
            let toggle_answer_button = document.createElement("button");
            toggle_answer_button.type = "button";
            $(toggle_answer_button).text("Show Late Answer");
            $(toggle_answer_button).addClass("btn btn-warning");
            $(toggle_answer_button).css("margin-left", "5px");

            $(toggle_answer_button).click(
                function () {
                    var display_timestamp, button_text;
                    if (this.current_answer === "ontime") {
                        this.jTextArea.value = data.last_answer;
                        this.answer = data.last_answer;
                        display_timestamp = new Date(
                            data.last_timestamp
                        ).toLocaleString();
                        button_text = "Show on-Time Answer";
                        this.current_answer = "late";
                    } else {
                        this.jTextArea.value = data.answer;
                        this.answer = data.answer;
                        display_timestamp = tsString;
                        button_text = "Show Late Answer";
                        this.current_answer = "ontime";
                    }
                    this.renderMath(this.answer);
                    $(p).text(`Submitted: ${display_timestamp}`);
                    $(toggle_answer_button).text(button_text);
                }.bind(this)
            );

            this.buttonDiv.appendChild(toggle_answer_button);
        }
        let feedbackStr = "Your current saved answer is shown above.";
        if (typeof data.score !== "undefined") {
            feedbackStr = `Score: ${data.score}`;
        }
        if (data.comment) {
            feedbackStr += ` -- ${data.comment}`;
        }
        this.feedbackDiv.innerHTML = feedbackStr;

        $(this.feedbackDiv).removeClass("alert-danger");
        $(this.feedbackDiv).addClass("alert alert-success");
    }

    disableInteraction() {
        this.jTextArea.disabled = true;
    }

    async getAttachmentName() {
        // Get the attachment name from the /ns/assessment/has_attachment endpoint
        let requestUrl = `/ns/assessment/has_attachment/${this.divid}`;
        if (this.sid) {
            requestUrl += `?sid=${this.sid}`;
        }
        const response = await fetch(requestUrl);
        if (!response.ok) {
            console.error("Error fetching attachment name:", response.statusText);
            return null;
        }
        const obj = await response.json();
            if (obj.detail.hasAttachment) {
            // Return the S3 key for the attachment
            let filename = obj.detail.hasAttachment;
            // filename is everthing after the last slash
            filename = filename.substring(filename.lastIndexOf("/") + 1);
            let fmess = document.createElement("span");
            fmess.innerHTML = `Attachment: ${filename}`;
            this.attachDiv.appendChild(fmess);
        }
    }

    async uploadFile() {
        const files = this.fileUpload.files
        // get the suffix from the file name
        const fileName = files[0].name;
        const suffix = fileName.split('.').pop();
        // if the suffix is not in the list of allowed suffixes, return
        if (!['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(suffix)) {
            alert("File type not allowed. Please upload a jpg, jpeg, png, gif, or pdf file.");
            return;
        }
        // if the file size is greater than 5MB, return
        if (files[0].size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit. Please upload a smaller file.");
            return;
        }
        const data = new FormData()
        if (this.fileUpload.files.length > 0) {
            data.append('file', files[0])
            fetch(`/ns/logger/upload/${this.divid}`, {
                method: 'POST',
                body: data
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data)
                })
                .catch(error => {
                    console.error(error)
                })
        }
    }

    viewFile() {
        // Get the URL from the S3 API -- saved when we display in grader mode
        if (this.attachURL) {
            //window.open(this.attachURL, "_blank");
            //<embed src="example.pdf" type="application/pdf" width="100%" height="600px" />
            //switch to 
            const image_window = window.open("", "_blank")
            if (this.attachURL.indexOf('.pdf?') !== -1) {
                const embed = image_window.document.createElement("object");
                embed.setAttribute("data", this.attachURL);
                embed.setAttribute("type", "application/pdf");
                embed.setAttribute("width", "800px");
                embed.setAttribute("height", "1040px");
                image_window.document.body.appendChild(embed);
                let alt = image_window.document.createElement("a");
                alt.setAttribute("href", this.attachURL);
                alt.innerText = "Download PDF";
                embed.appendChild(alt);
            }
            else {
                const img = image_window.document.createElement("img");
                img.setAttribute("src", this.attachURL);
                img.setAttribute("style", "width:100%; height:auto;");
                image_window.document.body.appendChild(img);
            }
        } else {
            alert("No attachment for this student.")
        }
    }
}

/*=================================
== Find the custom HTML tags and ==
==   execute our code on them    ==
=================================*/
$(document).on("runestone:login-complete", function () {
    $("[data-component=shortanswer]").each(function () {
        if ($(this).closest("[data-component=timedAssessment]").length == 0) {
            // If this element exists within a timed component, don't render it here
            try {
                window.componentMap[this.id] = new ShortAnswer({
                    orig: this,
                    useRunestoneServices: eBookConfig.useRunestoneServices,
                });
            } catch (err) {
                console.log(`Error rendering ShortAnswer Problem ${this.id}
                Details: ${err}`);
            }
        }
    });
});
