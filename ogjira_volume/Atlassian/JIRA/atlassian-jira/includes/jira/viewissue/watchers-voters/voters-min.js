define("jira/viewissue/watchers-voters/voters",["require"],function(require){var VotersUsersCollection=require("jira/viewissue/watchers-voters/entities/voters-user-collection");var VotersView=require("jira/viewissue/watchers-voters/views/voters-view");var Issue=require("jira/issue");var InlineLayer=require("jira/ajs/layer/inline-layer");var InlineDialog=require("aui/inline-dialog");var $=require("jquery");var dialog=InlineDialog("#view-voter-list","voters",function(contents,trigger,doShowPopup){var loadingIcon=$("#vote-toggle").next(".icon");var collection=new VotersUsersCollection(Issue.getIssueKey());loadingIcon.addClass("loading");new VotersView({collection:collection}).render().done(function(viewHtml){contents.html(viewHtml);contents.find(".cancel").click(function(e){dialog.hide();e.preventDefault()});loadingIcon.removeClass("loading");doShowPopup()});collection.on("errorOccurred",function(){dialog.hide()})},{width:240,useLiveEvents:true,items:"#view-voters-list",preHideCallback:function(){return !InlineLayer.current}});$(document).bind("keydown",function(e){if(e.keyCode===27&&InlineDialog.current!==dialog&&dialog.is(":visible")){if(InlineDialog.current){InlineDialog.current.hide()}dialog.hide()}});$(document).click(function(e){var currentDialog=InlineDialog.current;if(currentDialog&&currentDialog.id==="voters"){if(!$(e.target).closest("#inline-dialog-voters").length){currentDialog.hide()}}})});