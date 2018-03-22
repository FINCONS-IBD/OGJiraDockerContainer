define('jira/mention/mention-element', [
    'jira/mention/mention',
    'jira/skate',
    'underscore'
], function(
    Mention,
    skate,
    _
) {
    var mentionsController;

    function initMentionsFor(el) {
        var issueKey = el.getAttribute('data-issuekey');
        if (!el._controller) {
            el._controller = new Mention(issueKey);
        }
        el._controller.textarea(el);
    }

    return skate('mentionable', {
        type: skate.type.CLASSNAME,
        created: function(el) {
            if (!mentionsController) {
                mentionsController = new Mention();
            }
            el._controller = mentionsController;
        },
        attached: function(el) {
            if (document.activeElement === el) {
                initMentionsFor(el);
            }
        },
        events: {
            'focus': function(el, e) {
                initMentionsFor(el);
            }
        }
    });
});
