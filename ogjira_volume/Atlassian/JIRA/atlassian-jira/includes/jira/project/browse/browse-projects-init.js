require(['jquery',
         'jira/project/browse/app',
         'jira/project/browse/projecttypesservice'],
    function($, App, ProjectTypesService) {
    $(function() {
        var $browseContainer = $('#browse-projects-page');
        if ($browseContainer.length) {
            ProjectTypesService.init(WRM.data.claim('com.atlassian.jira.project.browse:projectTypes'));
            App.start({
                projects: WRM.data.claim('com.atlassian.jira.project.browse:projects'),
                categories: WRM.data.claim('com.atlassian.jira.project.browse:categories'),
                selectedCategory: WRM.data.claim('com.atlassian.jira.project.browse:selectedCategory'),
                availableProjectTypes: WRM.data.claim('com.atlassian.jira.project.browse:availableProjectTypes'),
                selectedProjectType: WRM.data.claim('com.atlassian.jira.project.browse:selectedProjectType'),
                container: $browseContainer
            });
        }
    });
});