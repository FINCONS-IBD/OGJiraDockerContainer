define("jira/shifter/shifter-controller",["jira/lib/class","jira/shifter/shifter-dialog","jira/shifter/shifter-analytics","underscore"],function(Class,ShifterDialog,ShifterAnalytics,_){return Class.extend({MAX_RESULTS_PER_GROUP:5,init:function(id){this.id=id;this.groupFactories=[]},register:function(groupFactory){this.groupFactories.push(groupFactory);return groupFactory},unregister:function(groupFactory){this.groupFactories=_.without(this.groupFactories,groupFactory);return groupFactory},show:function(){ShifterAnalytics.show();if(!this.dialog||this.dialog.destroyed()){var groups=_.chain(this.groupFactories).map(function(factory){return factory()}).compact().flatten().value().sort(function(a,b){return a.weight-b.weight});this.dialog=new ShifterDialog(this.id,groups,{maxResultsDisplayedPerGroup:this.MAX_RESULTS_PER_GROUP})}this.dialog.focus()},hide:function(){this.dialog&&this.dialog.destroy()}})});AJS.namespace("JIRA.ShifterComponent.ShifterController",window,require("jira/shifter/shifter-controller"));