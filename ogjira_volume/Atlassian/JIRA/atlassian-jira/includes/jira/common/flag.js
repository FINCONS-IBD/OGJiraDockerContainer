define('jira/flag', [
    'aui/flag',
    'jira/ajs/ajax/smart-ajax',
    'underscore',
    'jquery',
    'wrm/data',
    'wrm/context-path'
], function(
    flag,
    smartAjax,
    _,
    $,
    wrmData,
    contextPath
) {
    'use strict';

    var defaults = {
        type: 'info',
        title: '',
        body: ''
    };

    var typeDefaults = {
        'success': { close: 'auto' }
    };

    var claimDismissedFlags = _.once(function () {
        var dismissedData = wrmData.claim('com.atlassian.jira.jira-header-plugin:dismissedFlags.flags') || {};
        return dismissedData.dismissed || [];
    });

    function storeFlagInSession (flag) {
        var dismissed = getFlagsInSession();
        if (!_.contains(dismissed, flag)) {
            dismissed.push(flag);
            sessionStorage.setItem("dismissedFlags", JSON.stringify(dismissed));
        }
    }

    function removeFlagFromSession (flag) {
        var dismissed  = _.without(getFlagsInSession(), flag);
        sessionStorage.setItem("dismissedFlags", JSON.stringify(dismissed));
    }

    function getFlagsInSession () {
        return JSON.parse(sessionStorage.getItem("dismissedFlags")) || [];
    }

    function getDismissedFlags () {
        return _.union(claimDismissedFlags(), getFlagsInSession());
    }

    function dismiss (flag) {
        storeFlagInSession(flag);
        smartAjax.makeRequest({
            type: 'PUT',
            url: contextPath() + '/rest/flags/1.0/flags/' + encodeURIComponent(flag) + '/dismiss'
        }).done(function () {
            removeFlagFromSession(flag);
        }).always(function() {
            JIRA.trace("flag.dismiss.finished:" + flag);
        });
    }

    function showMsg (title, body, options) {
        options = options || {};
        var settings = _.extend({}, defaults, typeDefaults[options.type],
                options, {title: title ? title : '', body: body ? body : ''});
        var dismissalKey = settings.dismissalKey;

        if (dismissalKey && _.contains(getDismissedFlags(), dismissalKey)) {
            return false;
        }

        var displayedFlag = flag(settings);

        if (dismissalKey) {
            displayedFlag.dismiss = function () { dismiss(dismissalKey); };
            displayedFlag.addEventListener('aui-flag-close', displayedFlag.dismiss);
        } else {
            displayedFlag.dismiss = function () {};
        }

        // AUI-2828: title is rendered as an empty element even if not used :(
        var $title = $(displayedFlag).find('.title');
        if ($.trim($title.text()) === "") {
            $title.remove();
        }

        return displayedFlag;
    }

    function showErrorMsg (title, body, options) {
        return showMsg(title, body, _.extend({}, options, {type: 'error'}));
    }

    function showWarningMsg (title, body, options) {
        return showMsg(title, body, _.extend({}, options, {type: 'warning'}));
    }

    function showSuccessMsg (title, body, options) {
        return showMsg(title, body, _.extend({}, options, {type: 'success'}));
    }

    function showMessages (messages) {
        messages.forEach(function (message) {
            showMsg(message.title, message.htmlMessage, {
                close: message.auiClosingPolicy,
                type: message.auiMessageType
            });
        });
    }

    //Try and dismiss the flags on next page load. Wait for a while to ensure that any other important
    //page content been executed. I don't do any throttling because there should be very few flags and the REST
    //API is very quick as it doesn't do very much.
    var initialFlagsInSession = getFlagsInSession();
    setTimeout(function () {
        _.each(initialFlagsInSession, dismiss);
    }, 1000);

    return {
        showMsg: showMsg,
        showMessages: showMessages,
        showInfoMsg: showMsg,
        showErrorMsg: showErrorMsg,
        showWarningMsg: showWarningMsg,
        showSuccessMsg: showSuccessMsg
    };
});
