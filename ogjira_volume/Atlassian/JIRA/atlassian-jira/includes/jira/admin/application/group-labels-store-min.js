define("jira/admin/application/group-labels-store",["jquery","underscore"],function($,_){var GroupLabelsStore={listeners:[],lastResult:null,lastRequest:null,syncLabels:function(groupName,roleName,callback){var listener={groupName:groupName,roleName:roleName,callback:callback};this.listeners.push(listener);if(this.lastResult){this.triggerListener(listener,this.lastResult)}this.fetchLabels();return listener},removeHandler:function(callback){this.listeners=this.listeners.filter(function(listener){return listener.callback!==callback})},fetchLabels:function(){if(this.lastRequest&&!this.lastRequest.isResolved()){this.lastRequest.abort()}this.doRequest()},doRequest:_.debounce(function(){this.lastRequest=$.get(contextPath+"/rest/internal/2/applicationrole/groups").then(this.triggerListeners.bind(this))},50),triggerListeners:function(result){this.lastResult=result;this.listeners.forEach(function(listener){this.triggerListener(listener,result)},this)},triggerListener:function(listener,result){result.forEach(function(group){if(listener.groupName==group.name){listener.callback(group.labels)}})}};return GroupLabelsStore});