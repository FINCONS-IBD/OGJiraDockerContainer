(function(){var SingleIssuePicker=require("jira/field/single-issue-picker");var Events=require("jira/util/events");var Types=require("jira/util/events/types");var Reasons=require("jira/util/events/reasons");var $=require("jquery");function initIssuePicker(el){$(el||document.body).find(".aui-field-singleissuepicker").each(function(){var issuePicker=new SingleIssuePicker({element:$(this),userEnteredOptionsMsg:AJS.I18n.getText("linkissue.enter.issue.key"),uppercaseUserEnteredOnSelect:true});this.issuePicker=issuePicker})}Events.bind(Types.NEW_CONTENT_ADDED,function(e,context,reason){if(reason!==Reasons.panelRefreshed){initIssuePicker(context)}})})();