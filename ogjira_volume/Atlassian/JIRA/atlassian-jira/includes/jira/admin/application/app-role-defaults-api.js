define("jira/admin/application/defaults/api", [
        "backbone"
], function (Backbone) {
    var DefaultsApi = Backbone.Marionette.Controller.extend({
        EVENT_ON_SHOW: "show"
    });

    return new DefaultsApi();
});