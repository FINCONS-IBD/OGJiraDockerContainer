define('jira/mention/mention', [
    'jira/ajs/control',
    'jira/dialog/dialog',
    'jira/mention/mention-user',
    'jira/mention/mention-group',
    'jira/mention/mention-matcher',
    'jira/mention/scroll-pusher',
    'jira/mention/contextual-mention',
    'jira/mention/contextual-mention-helper',
    'jira/mention/contextual-mention-analytics-event',
    'jira/mention/uncomplicated-inline-layer',
    'jira/ajs/layer/inline-layer/standard-positioning',
    'jira/ajs/dropdown/dropdown-list-item',
    'jira/util/events',
    'jira/util/navigator',
    'aui/progressive-data-set',
    'jquery',
    'underscore',
    'wrm/context-path'
], function(
    Control,
    Dialog,
    UserModel,
    MentionGroup,
    MentionMatcher,
    ScrollPusher,
    ContextualMention,
    ContextualMentionHelper,
    ContextualMentionAnalyticsEvent,
    UncomplicatedInlineLayer,
    InlineLayerStandardPositioning,
    DropdownListItem,
    Events,
    Navigator,
    ProgressiveDataSet,
    jQuery,
    _,
    contextPath
) {
    "use strict";

    /**
     * Provides autocomplete for username mentions in textareas.
     *
     * @class Mention
     * @extends Control
     */
    return Control.extend({

        CLASS_SIGNATURE: "AJS_MENTION",

        lastInvalidUsername: "",

        lastRequestMatch: true,

        lastValidUsername: "",

        init: function() {
            var instance = this;
            this.listController = new MentionGroup();

            this.dataSource = new ProgressiveDataSet([], {
                model: UserModel,
                queryEndpoint: contextPath() + "/rest/api/2/user/viewissue/search",
                queryParamKey: "username",
                queryData: _.bind(this._getQueryParams, this)
            });
            this.dataSource.matcher = function(model, query) {
                var matches = false;
                matches = matches || instance._stringPartStartsWith(model.get("name"), query);
                matches = matches || instance._stringPartStartsWith(model.get("displayName"), query);
                return matches;
            };
            this.dataSource.bind('respond', function(response) {
                var results = response.results;
                var username = response.query;

                ContextualMention.initContextualMentions(results, response.query);

                if (!username) {
                    return;
                }

                // Update the state of mentions matches
                if (!results.length) {
                    if (username) {
                        if (instance.dataSource.hasQueryCache(username)) {
                            if (!instance.lastInvalidUsername || username.length <= instance.lastInvalidUsername.length) {
                                instance.lastInvalidUsername = username;
                            }
                        }
                    }
                    instance.lastRequestMatch = false;
                } else {
                    instance.lastInvalidUsername = "";
                    instance.lastValidUsername = username;
                    instance.lastRequestMatch = true;
                }

                // Set the results
                var $suggestions = instance.generateSuggestions(results, username);
                instance.updateSuggestions($suggestions);
            });
            this.dataSource.bind('activity', function(response) {
                if (response.activity) {
                    instance.layerController._showLoading();
                } else {
                    instance.layerController._hideLoading();
                }
            });
        },

        updateSuggestions: function($suggestions) {
            if (this.layerController) {
                this.layerController.content($suggestions);
                this.layerController.show();
                this.layerController.refreshContent();
            }
        },

        _getQueryParams: function() {
            return this.restParams;
        },

        _setQueryParams: function() {
            var params = {
                issueKey: this.$textarea.attr("data-issuekey"),
                projectKey: this.$textarea.attr("data-projectkey"),
                maxResults: 10
            };

            if (Dialog.current && Dialog.current.options.id === "create-issue-dialog") {
                delete params.issueKey;
            }

            this.restParams = params;
        },

        /**
         * Creates a custom event for follow-scroll attribute.
         * This custom event will call setPosition() when the element referenced in "textarea[follow-scroll]" attribute
         *
         * @param customEvents
         * @returns {*}
         * @private
         */
        _composeCustomEventForFollowScroll: function(customEvents) {
            customEvents = customEvents || {};
            var followScroll = this.$textarea.attr("follow-scroll");
            if (followScroll && followScroll.length) {
                customEvents[followScroll] = {
                    "scroll": function() {
                        this.setPosition();
                    }
                };
            }
            return customEvents;
        },

        textarea: function(textarea) {

            var instance = this;

            if (textarea) {
                this.$textarea = jQuery(textarea);

                jQuery("#mentionDropDown").remove();

                if (this.$textarea.attr("push-scroll")) {
                    /**
                     * If we are pushing the scroll, force the layer to use standard positioning. Otherwise
                     * it might end using {@see WindowPositioning} that conflicts with the intention of
                     * pushing scroll
                     */
                    var positioningController = new InlineLayerStandardPositioning();
                    var scrollPusher = ScrollPusher(this.$textarea, 10);
                }

                this.layerController = new UncomplicatedInlineLayer({
                    offsetTarget: this.textarea(),
                    allowDownsize: true,
                    positioningController: positioningController, // Will be undefined if no push-scroll, that is ok
                    customEvents: this._composeCustomEventForFollowScroll(),

                    /**
                     * Allows for shared object between comment boxes.
                     *
                     * Closure returns the width of the focused comment form.
                     * This comes into effect on the View Issue page where the top and
                     * bottom comment textareas are the same element moved up and down.
                     * @ignore
                     */
                    width: function() {
                        return instance.$textarea.width();
                    }
                });

                this.layerController.bind("showLayer", function() {
                    // Binds events to handle list navigation
                    instance.listController.trigger("focus");
                    instance._assignEvents("win", window);
                }).bind("hideLayer", function() {
                    // Unbinds events to handle list navigation
                    instance.listController.trigger("blur");
                    instance._unassignEvents("win", window);

                    // Try to reset the scroll
                    if (scrollPusher) {
                        scrollPusher.reset();
                    }
                }).bind("contentChanged", function() {
                    if (!instance.layerController.$content) {
                        return;
                    }
                    instance.listController.removeAllItems();
                    instance.layerController.$content.find("li").each(function() {
                        var li = jQuery(this);
                        li.click(function(event) {
                            instance._acceptSuggestion(li);
                            event.preventDefault();
                        });

                        instance.listController.addItem(new DropdownListItem({
                            element: li,
                            autoScroll: true
                        }));
                    });
                    instance.listController.prepareForInput();
                    instance.listController.shiftFocus(0);
                }).bind("setLayerPosition", function(event, positioning, inlineLayer) {
                    if (Dialog.current && Dialog.current.$form) {
                        var buttonRow = Dialog.current.$popup.find(".buttons-container:visible");
                        if (buttonRow.length && positioning.top > buttonRow.offset().top) {
                            positioning.top = buttonRow.offset().top;
                        }
                    }

                    // Try to make the scroll element bigger so we have room for rendering the layer
                    if (scrollPusher) {
                        scrollPusher.push(positioning.top + inlineLayer.layer().outerHeight(true));
                    }
                });

                this.layerController.layer().attr("id", "mentionDropDown");

                this._assignEvents("inlineLayer", instance.layerController.layer());
                this._assignEvents("textarea", instance.$textarea);

                this._setQueryParams();
            } else {
                return this.$textarea;
            }
        },

        /**
         * Generates autocomplete suggestions for usernames from the server response.
         * @param data The server response.
         * @param  {string} username The selected username
         */
        generateSuggestions: function(data, username) {
            var regex = new RegExp("(?:^|(.*(\\s+|\\(|\\@)))(" + RegExp.escape(username) + ")(.*)", "i");

            function highlight(text) {
                var result = {
                    text: text
                };

                if (text && text.length && text.toLowerCase().indexOf(username.toLowerCase()) > -1) {
                    text.replace(regex, function(_, prefix, spaceOrParenthesis, match, suffix) {
                        result = {
                            prefix: !prefix ? "" : prefix,
                            match: match,
                            suffix: suffix
                        };
                    });
                }
                return result;
            }

            function rolesAsString(roles) {
                return '@' + roles.join(',@');
            }


            var filteredData = _.map(data, function(model) {
                var user = model.toJSON();
                user.username = user.name;
                user.emailAddress = highlight(user.emailAddress);
                user.displayName = highlight(user.displayName);
                user.name = highlight(user.name);
                if (user.roles && user.roles.length > 0) {
                    user.roles = {
                        plainString: rolesAsString(user.roles),
                        highlight: highlight(rolesAsString(user.roles))
                    };
                }
                return user;
            });

            return jQuery(JIRA.Templates.mentionsSuggestions({
                suggestions: filteredData,
                query: username,
                activity: (this.dataSource.activeQueryCount > 0)
            }));
        },

        /**
         * Triggered when a user clicks on or presses enter on a highlighted username entry.
         *
         * The username value is stored in the rel attribute
         *
         * @param li The selected element.
         */
        _acceptSuggestion: function(li) {
            this._hide();
            ContextualMentionAnalyticsEvent.fireUserMayAcceptSuggestionByUsingContextualMentionEvent(this._getCurrentUserName());
            this._replaceCurrentUserName(li.find("a").attr("rel"));
            this.listController.removeAllItems();
        },

        /**
         * Heavy-handed method to insert the selected user's username.
         *
         * Replaces the keyword used to search for the selected user with the
         * selected user's username.
         *
         * If a user is searched for with wiki-markup, the wiki-markup is replaced
         * with the @format mention.
         *
         * @param selectedUserName The username of the selected user.
         */
        _replaceCurrentUserName: function(selectedUserName) {
            var raw = this._rawInputValue();
            var caretPos = this._getCaretPosition();
            var beforeCaret = raw.substr(0, caretPos);
            var wordStartIndex = MentionMatcher.getLastWordBoundaryIndex(beforeCaret, true);

            var before = raw.substr(0, wordStartIndex + 1).replace(/\r\n/g, "\n");
            var username = "[~" + selectedUserName + "]";
            var after = raw.substr(caretPos);

            this._rawInputValue([before, username, after].join(""));
            this._setCursorPosition(before.length + username.length);
        },

        /**
         * Sets the cursor position to the specified index.
         *
         * @param index The index to move the cursor to.
         */
        _setCursorPosition: function(index) {
            var input = this.$textarea.get(0);
            if (input.setSelectionRange) {
                input.focus();
                input.setSelectionRange(index, index);
            } else if (input.createTextRange) {
                var range = input.createTextRange();
                range.collapse(true);
                range.moveEnd('character', index);
                range.moveStart('character', index);
                range.select();
            }
        },

        /**
         * Returns the position of the cursor in the textarea.
         */
        _getCaretPosition:function(){

            var element = this.$textarea.get(0);
            var rawElementValue = this._rawInputValue();
            var caretPosition;
            var range;
            var offset;
            var normalizedElementValue;
            var elementRange;

            if (typeof element.selectionStart === "number") {
                return element.selectionStart;
            }

            if (document.selection && element.createTextRange) {
                range = document.selection.createRange();
                if (range) {
                    elementRange = element.createTextRange();
                    elementRange.moveToBookmark(range.getBookmark());

                    if (elementRange.compareEndPoints("StartToEnd", element.createTextRange()) >= 0) {
                        return rawElementValue.length;
                    } else {
                        normalizedElementValue = rawElementValue.replace(/\r\n/g, "\n");
                        offset = elementRange.moveStart("character", -rawElementValue.length);
                        caretPosition = normalizedElementValue.slice(0, -offset).split("\n").length - 1;
                        return caretPosition - offset;
                    }
                }
                else {
                    return rawElementValue.length;
                }
            }
            return 0;
        },

        /**
         * Gets or sets the text value of our input via the browser, not jQuery.
         * @return The precise value of the input element as provided by the browser (and OS).
         * @private
         */
        _rawInputValue: function() {
            var el = this.$textarea.get(0);
            if (typeof arguments[0] === "string") {
                el.value = arguments[0];
            }
            return el.value;
        },

        /**
         * Sets the current username and triggers a content refresh.
         */
        fetchUserNames: function(username) {
            this.dataSource.query(username);
        },

        /**
         * Returns the current username search key.
         */
        _getCurrentUserName: function() {
            return this.currentUserName;
        },

        /**
         * Hides the autocomplete dropdown.
         */
        _hide: function() {
            this.layerController.hide();
        },

        /**
         * Shows the autocomplete dropdown.
         */
        _show: function() {
            this.layerController.show();
        },

        /**
         * Key up listener.
         *
         * Figure out what our input is, then if we need to, get some suggestions.
         */
        _keyUp: function() {
            var caret = this._getCaretPosition();
            var username = this._getUserNameFromInput(caret);
            username = jQuery.trim(username || "");
            if (this._isNewRequestRequired(username)) {
                this.fetchUserNames(username);
            } else if (!this._keepSuggestWindowOpen(username)) {
                this._hide();
            }
            this.lastQuery = username;
            delete this.willCheck;
        },

        /**
         *  Checks if suggest window should be open
         * @return {Boolean}
         */
        _keepSuggestWindowOpen: function(username) {
            if (!username) {
                return false;
            }
            if (this.layerController.isVisible()) {
                return this.dataSource.activeQueryCount || this.lastRequestMatch;
            }
            return false;
        },

        /**
         * Checks if server pool for user names is needed
         * @param username
         * @return {Boolean}
         */
        _isNewRequestRequired:function(username) {
            if (!username) {
                return false;
            }
            username = jQuery.trim(username);
            if (username === this.lastQuery) {
                return false;
            } else if (this.lastInvalidUsername) {
                // We use indexOf instead of stringPartStartsWith here, because we want to check the whole input, not parts.
                //Do not do a new request if they have continued typing after typing an invalid username.
                if (username.indexOf(this.lastInvalidUsername) === 0 && (this.lastInvalidUsername.length < username.length)) {
                    return false;
                }
            } else if (!this.lastRequestMatch && username === this.lastValidUsername) {
                return true;
            }

            return true;
        },

        _stringPartStartsWith: function(text,startsWith) {
            text = jQuery.trim(text || "").toLowerCase();
            startsWith = (startsWith || "").toLowerCase();
            var nameParts = text.split(/\s+/);

            if (!text || !startsWith) {
                return false;
            }
            if (text.indexOf(startsWith) === 0) {
                return true;
            }

            return _.any(nameParts, function(word) {
                return word.indexOf(startsWith) === 0;
            });
        },

        /**
         * Gets the username which the caret is currently next to from the textarea's value.
         *
         * WIKI markup form is matched, and then if nothing is found, @format.
         */
        _getUserNameFromInput: function(caret) {
            if (typeof caret !== "number") {
                caret = this._getCaretPosition();
            }
            return this.currentUserName = MentionMatcher.getUserNameFromCurrentWord(this._rawInputValue(), caret);
        },

        _events: {
            win: {
                resize: function() {
                    this.layerController.setWidth(this.$textarea.width());
                }
            },
            textarea: {
                /**
                 * Makes a check to update the suggestions after the field's value changes.
                 *
                 * Prevents the blurring of the field or closure of a dialog when the drop down is visible.
                 *
                 * Also takes into account IE removing text from an input when escape is pressed.
                 *
                 * When in a dialog, the general convention is that when escape is pressed when focused on an
                 * input the dialog will close immediately rather then just unfocus the input. We follow this convetion
                 * here.
                 *
                 * Please don't hurt me for using stopPropagation.
                 *
                 * @param e The key down event.
                 */
                "keydown": function(e) {
                    if (e.keyCode === jQuery.ui.keyCode.ESCAPE) {
                        if (this.layerController.isVisible()) {

                            if (Dialog.current) {
                                Events.one("Dialog.beforeHide", function(e) {
                                    e.preventDefault();
                                });
                            }

                            this.$textarea.one("keyup", function(keyUpEvent) {
                                if (keyUpEvent.keyCode === jQuery.ui.keyCode.ESCAPE) {
                                    keyUpEvent.stopPropagation(); // Prevent unfocusing the input when esc is pressed
                                    Events.trigger("Mention.afterHide");
                                }
                            });
                        }

                        if (Navigator.isIE() && Navigator.majorVersion() < 11) {
                            e.preventDefault();
                        }
                    } else if (e.keyCode === jQuery.ui.keyCode.SPACE) {
                        if (ContextualMentionHelper.hasContextualMentionInInput(this._rawInputValue())) {
                            ContextualMentionAnalyticsEvent.fireAcceptedContextualMentionAnalyticsEvent();

                            var contextualMention = ContextualMentionHelper.getContextualMentionPartFromInput(this._rawInputValue());
                            var suggestion = ContextualMentionHelper.getAppropriateSuggestion(this.layerController.$content, contextualMention);
                            if (suggestion && suggestion.length > 0) {
                                this._acceptSuggestion(suggestion);
                            }
                        }
                    } else if (!this.willCheck) {
                        //Only trigger keyUp if the key is not ESCAPE
                        this.willCheck = _.defer(_.bind(this._keyUp, this));
                        _.defer(_.bind(function() {
                            var username = this._getUserNameFromInput(this._getCaretPosition());
                            ContextualMentionAnalyticsEvent.fireContextualMentionIsBeingLookedUpAnalyticsEvent(username, e.keyCode, e.ctrlKey, e.metaKey);
                        }, this));
                    }
                },

                "focus": function() {
                    this._keyUp();
                },

                "mouseup": function() {
                    this._keyUp();
                },

                /**
                 * Prevents a bug where another inline layer will focus on comment textarea when
                 * an item in it is selected (quick admin search).
                 */
                "blur": function() {
                    this.listController.removeAllItems();
                    this.lastQuery = this.lastValidUsername = this.lastInvalidUsername = "";
                }
            },

            inlineLayer: {

                /**
                 * JRADEV-21950
                 * Prevents the blurring of the textarea when the InlineLayer is clicked;
                 */
                mousedown: function(e) {
                    e.preventDefault();
                }
            }
        }
    });
});

define('jira/mention/mention-user', [
    'backbone'
], function(
    Backbone
) {
    return Backbone.Model.extend({ idAttribute: "name" });
});

define('jira/mention/mention-matcher', [
    'jquery'
], function(
    jQuery
) {
    return {

        AT_USERNAME_START_REGEX: /^@(.*)/i,
        AT_USERNAME_REGEX: /[^\[]@(.*)/i,
        WIKI_MARKUP_REGEX: /\[[~@]+([^~@]*)/i,
        ACCEPTED_USER_REGEX: /\[~[^~\]]*\]/i,
        WORD_LIMIT: 3,

        getUserNameFromCurrentWord: function(text, caretPosition) {
            var before = text.substr(0, caretPosition);
            var lastWordStartIndex = this.getLastWordBoundaryIndex(before, false);
            var prevChar = before.charAt(lastWordStartIndex - 1);
            var currentWord;
            var foundMatch = null;

            if (!prevChar || !/\w/i.test(prevChar)) {
                currentWord = this._removeAcceptedUsernames(before.substr(lastWordStartIndex));
                if (/[\r\n]/.test(currentWord)) {
                    return null;
                }

                jQuery.each([this.AT_USERNAME_START_REGEX, this.AT_USERNAME_REGEX, this.WIKI_MARKUP_REGEX], function(i, regex) {
                    var match = regex.exec(currentWord);
                    if (match) {
                        foundMatch = match[1];
                        return false;
                    }
                });
            }

            return (foundMatch != null && this.lengthWithinLimit(foundMatch, this.WORD_LIMIT)) ? foundMatch : null;
        },

        lengthWithinLimit: function(input, length) {
            var parts = jQuery.trim(input).split(/\s+/);
            return parts.length <= ~~length;
        },

        getLastWordBoundaryIndex: function(text, strip) {
            var lastAt = text.lastIndexOf("@");
            var lastWiki = text.lastIndexOf("[~");

            if (strip) {
                lastAt = lastAt - 1;
                lastWiki = lastWiki - 1;
            }

            return (lastAt > lastWiki) ? lastAt : lastWiki;
        },

        _removeAcceptedUsernames: function(phrase) {
            var match = this.ACCEPTED_USER_REGEX.exec(phrase);

            if (match) {
                return phrase.split(match)[1];
            }
            else {
                return phrase;
            }
        }
    };
});

define('jira/mention/scroll-pusher', ['jquery'], function(jQuery) {
    return function($el, defaultMargin) {
        defaultMargin = defaultMargin || 0;

        var $scroll = jQuery($el.attr("push-scroll"));
        var originalScrollHeight;

        /**
         * Push the scroll of $scroll element to make room for inlineLayer
         * @param layerBottom {number} Bottom position of the layer (relative to the page)
         * @param margin {number} Extra space to left between layer and scroll
         */
        function push(layerBottom, margin) {
            if (typeof margin === "undefined") {
                margin = defaultMargin;
            }
            var scrollBottom = $scroll.offset().top + $scroll.outerHeight();
            var overflow = layerBottom - scrollBottom;

            if (overflow + margin > 0) {
                if (!originalScrollHeight) {
                    originalScrollHeight = $scroll.height();
                }
                $scroll.height($scroll.height() + overflow + margin);
            }
        }

        /**
         * Resets the scroll
         */
        function reset() {
            if (originalScrollHeight) {
                $scroll.height(originalScrollHeight);
            }
        }

        return {
            push: push,
            reset: reset
        };
    };
});

define('jira/mention/contextual-mention', [
    'jquery',
    'underscore',
    'jira/mention/mention-user'
], function(
    $,
    _,
    UserModel
) {
    return {

        AVATAR_URL_FOR_24x24_REGEX: /^(.*?\&s\=)(24)$/,
        REPORTER_ROLE: "reporter",
        ASSIGNEE_ROLE: "assignee",

        USER_WITH_ROLE_SELECTORS: {
            "assignee": '#assignee-val',
            "reporter": '#reporter-val'
        },

        initContextualMentions: function(results, query) {
            if (this._stringPartStartsWith(this.REPORTER_ROLE, query)) {
                this._addUserWithMentionRoleIntoResultsIfNotExists(results, this.REPORTER_ROLE);
            } else if (this._stringPartStartsWith(this.ASSIGNEE_ROLE, query)) {
                this._addUserWithMentionRoleIntoResultsIfNotExists(results, this.ASSIGNEE_ROLE);
            }

            this._updateRolesForExistingUsersInResult(results);

            this._moveUsersWithRoleToTopOfResults(results);
        },

        _updateRolesForExistingUsersInResult: function(results) {
            var instance = this;

            function updateRolesForGivenUser(usersWithRoleFromResults, role) {
                if (usersWithRoleFromResults.hasRecentUserWithRole()) {
                    instance._removeRoleFromUser(usersWithRoleFromResults.recentUser, role);
                }
                if (usersWithRoleFromResults.hasUserWithoutAppropriateRoleInResults()) {
                    instance._fillRoleIntoExistingUserModel(usersWithRoleFromResults.currentUser, role);
                }

            }

            _.each([this.REPORTER_ROLE, this.ASSIGNEE_ROLE], function(role) {
                var userDataFromPeopleBlock = instance._getUserDataWhoseGivenRoleFromPeopleBlock(role);
                if (userDataFromPeopleBlock) {
                    var usersWithRoleFromResults = instance._getUsersWithRoleFromResultsIfAny(results, role, userDataFromPeopleBlock.username);
                    updateRolesForGivenUser(usersWithRoleFromResults, role);
                }
            });
        },

        _addUserWithMentionRoleIntoResultsIfNotExists: function(results, role) {
            var instance = this;
            var userDataFromPeopleBlock = this._getUserDataWhoseGivenRoleFromPeopleBlock(role);
            if (!userDataFromPeopleBlock) { return; }

            var usersWithRoleFromResults = this._getUsersWithRoleFromResultsIfAny(results, role, userDataFromPeopleBlock.username);

            function addNewUserModelForGivenRoleIntoResults() {
                var userModel = new UserModel({
                    name: userDataFromPeopleBlock.username,
                    avatarUrls: {
                        "16x16": userDataFromPeopleBlock.avatarUrl.replace(instance.AVATAR_URL_FOR_24x24_REGEX, function(input, prefix) {
                            return prefix + '16';
                        })
                    },
                    displayName: userDataFromPeopleBlock.displayName,
                    emailAddress: userDataFromPeopleBlock.emailAddress,
                    roles: [role]
                });
                results.unshift(userModel);
            }

            if (!usersWithRoleFromResults.currentUser) {
                addNewUserModelForGivenRoleIntoResults();
            }
        },

        _fillRoleIntoExistingUserModel: function(user, role) {
            if (user.attributes.roles) {
                if (user.attributes.roles.indexOf(role) < 0) {
                    user.attributes.roles.unshift(role);
                }
            } else {
                user.attributes.roles = [role];
            }
            user.attributes.roles.sort();
        },

        _removeRoleFromUser: function(user, role) {
            var desiredRoleIndex = user.attributes.roles.indexOf(role);
            user.attributes.roles.splice(desiredRoleIndex, 1);
        },

        _moveUsersWithRoleToTopOfResults: function(results) {
            results.sort(function(left, right) {
                var leftRoles = left.attributes.roles;
                var rightRoles = right.attributes.roles;

                if (leftRoles > rightRoles || leftRoles === undefined) {
                    return 1;
                } else if (leftRoles < rightRoles || rightRoles === undefined) {
                    return -1;
                }
                return 0;
            });
        },

        _getUserDataWhoseGivenRoleFromPeopleBlock: function(role) {
            var userData = $(this.USER_WITH_ROLE_SELECTORS[role]).find("span").first().data("user");
            if (userData === undefined) {
                return;
            }
            return userData;
        },

        _getUsersWithRoleFromResultsIfAny: function(results, role, username) {
            var currentUserWithRole;
            var currentUserIndex;
            var recentUserWithRole;
            _.each(results, function(result, idx) {
                var resultAsJson = result.toJSON();
                if (resultAsJson.roles && resultAsJson.roles.indexOf(role) >= 0) {
                    recentUserWithRole = result;
                }
                if (resultAsJson.name === username) {
                    currentUserWithRole = result;
                    currentUserIndex = idx;
                }
            });
            return {
                currentUser: currentUserWithRole,
                currentUserIndex: currentUserIndex,
                recentUser: recentUserWithRole,

                hasRecentUserWithRole: function() {
                    return recentUserWithRole !== undefined && recentUserWithRole !== currentUserWithRole;
                },

                hasUserWithoutAppropriateRoleInResults: function() {
                    return currentUserWithRole && (currentUserWithRole.attributes.roles === undefined || currentUserWithRole.attributes.roles.indexOf(role) < 0);
                }
            };
        },

        _stringPartStartsWith: function(text, startsWith) {
            text = $.trim(text || "").toLowerCase();
            startsWith = (startsWith || "").toLowerCase();
            var nameParts = text.split(/\s+/);

            if (!text || !startsWith) {
                return false;
            }
            if (text.indexOf(startsWith) === 0) {
                return true;
            }

            return _.any(nameParts, function(word) {
                return word.indexOf(startsWith) === 0;
            });
        }
    };
});

define('jira/mention/contextual-mention-helper', ['jquery'], function(jQuery) {
    var CONTEXTUAL_MENTION_REGEX = /^.*(\@(assignee|reporter)).*$/m;
    return {

        hasContextualMentionInInput: function(inputValue) {
            return CONTEXTUAL_MENTION_REGEX.test(inputValue);
        },

        getContextualMentionPartFromInput: function(inputValue) {
            return CONTEXTUAL_MENTION_REGEX.exec(inputValue)[1];
        },

        getAppropriateSuggestion: function($suggestions, contextualMention) {
            if (!$suggestions) {
                return;
            }
            return $suggestions.find("li").each(function() {
                var li = jQuery(this);
                var issueUserTypes = li.find("a").data("issue-roles");
                if (issueUserTypes && issueUserTypes.indexOf(contextualMention) >= 0) {
                    return li;
                }
            });
        }
    };
});

define('jira/mention/contextual-mention-analytics-event', [
    'jquery',
    'underscore'
], function(
    $,
    _
) {
    var USER_IS_LOOKING_FOR_CONTEXTUAL_MENTION_REGEX = /^(assi(gnee?)|repo(rter?))$/;
    var contextualMentionIsBeingLookedUpEvent = _.debounce(function(username, keyCode, ctrlKey, metaKey) {
        var isBackSpaceOrSelectAllKey = isBackSpacePressed(keyCode) || isSelectAllOperationPerforming(keyCode, ctrlKey, metaKey);
        var isUserLookingForContextualMention = USER_IS_LOOKING_FOR_CONTEXTUAL_MENTION_REGEX.test(username);

        if (isBackSpaceOrSelectAllKey === false && isUserLookingForContextualMention) {
            AJS.trigger("analytics", {name: 'issue.comment.contextualMention.lookup'});
        }
    }, 500);

    var isBackSpacePressed = function(keyCode) {
        return keyCode === $.ui.keyCode.BACKSPACE;
    };

    var isSelectAllOperationPerforming = function(keyCode, ctrlKey, metaKey) {
        return (keyCode === 'A'.charCodeAt() && (ctrlKey || metaKey)) || ctrlKey || metaKey;
    };

    return {
        fireAcceptedContextualMentionAnalyticsEvent: function() {
            AJS.trigger("analytics", {name: 'issue.comment.contextualMention.accepted'});
        },
        fireContextualMentionIsBeingLookedUpAnalyticsEvent: function(username, keyCode, ctrlKey, metaKey) {
            contextualMentionIsBeingLookedUpEvent(username, keyCode, ctrlKey, metaKey);
        },
        fireUserMayAcceptSuggestionByUsingContextualMentionEvent: function(username) {
            _.any(["assignee", "reporter"], function(contextualMention) {
                if (contextualMention.indexOf(username) === 0 && contextualMention !== username) {
                    AJS.trigger("analytics", {name: 'issue.comment.contextualMention.mayAccepted'});
                    return true;
                }
            });
        }
    };
});

AJS.namespace('JIRA.MentionUserModel', null, require('jira/mention/mention-user'));
AJS.namespace('JIRA.Mention', null, require('jira/mention/mention'));
AJS.namespace('JIRA.Mention.Matcher', null, require('jira/mention/mention-matcher'));
AJS.namespace('JIRA.Mention.ScrollPusher', null, require('jira/mention/scroll-pusher'));
AJS.namespace('JIRA.Mention.ContextualMention', null, require('jira/mention/contextual-mention'));
AJS.namespace('JIRA.Mention.ContextualMentionHelper', null, require('jira/mention/contextual-mention-helper'));
AJS.namespace('JIRA.Mention.ContextualMentionAnalyticsEvent', null, require('jira/mention/contextual-mention-analytics-event'));
