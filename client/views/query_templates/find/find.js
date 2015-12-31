/**
 * Created by sercan on 30.12.2015.
 */
var strSessionSelectedOptions = "selectedCursorOptions";

Template.find.onRendered(function () {
    // set ace editor
    initializeAceEditor();
    initializeOptions();
    initializeSessionVariable();
});

Template.browseCollection.events({
    'keypress #preSelector': function (e) {
        // catch enter
        if (e.keyCode == 13) {
            executeQuery();
            return false;
        }
    },

    'click #btnExecuteQuery': function (e) {
        executeQuery();
    }
});

executeQuery = function () {
    // hide results
    $('#divJsonEditor').hide();
    $('#divAceEditor').hide();

    // loading button
    var l = $('#btnExecuteQuery').ladda();
    l.ladda('start');

    var connection = Connections.findOne({_id: Session.get(strSessionConnection)});
    var selectedCollection = Session.get(strSessionSelectedCollection);

    var selector = ace.edit("preSelector").getSession().getValue();
    if (!selector) {
        selector = {};
    }
    else {
        try {
            selector = JSON.parse(selector);
        }
        catch (err) {
            toastr.error("Syntax error: " + err.message);
            // stop loading animation
            l.ladda('stop');
            return;
        }
    }

    Meteor.call('executeFindQuery', connection, selectedCollection, selector, function (err, result) {
        if (err || result.error) {
            var errorMessage;
            if (err) {
                errorMessage = err.message;
            } else {
                errorMessage = result.error.message;
            }
            toastr.error("Couldn't execute query: " + errorMessage);
            // stop loading animation
            l.ladda('stop');
            return;
        }

        // set json editor
        getEditor().set(result.result);

        // set ace editor
        AceEditor.instance("aceeditor", {
            mode: "javascript",
            theme: 'dawn'
        }, function (editor) {
            editor.$blockScrolling = Infinity;
            editor.setOptions({
                fontSize: "12pt",
                showPrintMargin: false
            });
            editor.setValue(JSON.stringify(result.result, null, '\t'), -1);
        });

        $('#divJsonEditor').show('slow');

        // stop loading animation
        l.ladda('stop');
    });
}

initializeAceEditor = function () {
    AceEditor.instance("preSelector", {
        mode: "javascript",
        theme: 'dawn'
    }, function (editor) {
        editor.$blockScrolling = Infinity;
        editor.setOptions({
            fontSize: "11pt",
            showPrintMargin: false,
        });

        // remove newlines in pasted text
        editor.on("paste", function (e) {
            e.text = e.text.replace(/[\r\n]+/g, " ");
        });
        // make mouse position clipping nicer
        editor.renderer.screenToTextCoordinates = function (x, y) {
            var pos = this.pixelToScreenCoordinates(x, y);
            return this.session.screenToDocumentPosition(
                Math.min(this.session.getScreenLength() - 1, Math.max(pos.row, 0)),
                Math.max(pos.column, 0)
            );
        };
        // disable Enter Shift-Enter keys
        editor.commands.bindKey("Enter|Shift-Enter", executeQuery);
    });
}

initializeOptions = function () {
    var cmb = $('#cmbCursorOptions');
    $.each(CURSOR_OPTIONS, function (key, value) {
        cmb.append($("<option></option>")
            .attr("value", key)
            .text(value));
    });

    cmb.chosen();
    cmb.on('change', function (evt, params) {
        var array = Session.get(strSessionSelectedOptions);
        if (params.deselected) {
            array.remove(params.deselected);
        }
        else {
            array.push(params.selected);
        }
        Session.set(strSessionSelectedOptions, array);
    });
}

initializeSessionVariable = function () {
    Session.set(strSessionSelectedOptions, []);
}