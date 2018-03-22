require([
    "jquery",
    "jira/setup/setup-mode-view",
    "jira/setup/setup-account-view",
    "jira/setup/setup-finishing-layout",
    "jira/setup/setup-database-view",
    "jira/setup/setup-license",
    "jira/setup/setup-tracker"
], function(
    $,
    SetupModeView,
    SetupAccountView,
    SetupFinishingLayout,
    SetupDatabaseView,
    SetupLicense,
    SetupTracker)
{
    $(function(){
        var views = {
            "jira-setup-mode-page": SetupModeView,
            "jira-setup-account-page": SetupAccountView,
            "jira-setup-finishing-page": SetupFinishingLayout,
            "jira-setup-database-page": SetupDatabaseView
        };

        $.each(views, function(classname, ViewClass){
            if ($("body").hasClass(classname)){
                new ViewClass({
                    el: "." + classname
                });
            }
        });

        var $body = $("body");
        if ($body.hasClass("jira-setup-license-page")){
            // there's really no view for SetupLicense page yet, but it had to become an AMD module
            // so that it's possible to write tests for it
            SetupLicense.startPage();
        } else if ($body.hasClass("jira-setup-account-license-error")){
            // if the user's journey from MAC ends up in a failure, send this up.
            SetupTracker.sendUserArrivedFromMacFailed();
        }
    });
});
