define("jira/admin/application/defaults/ApplicationView",
    ["jquery", "underscore", "backbone"],
    function($, _, Backbone) {
        "use strict";
        var Marionette = Backbone.Marionette;

        return Marionette.ItemView.extend({
            className: "checkbox",
            template: JIRA.Templates.ApplicationSelector.applicationCheckbox,

            ui: {
                setting: ".checkbox"
            },

            triggers: {
                "change @ui.setting": "setting:changed"
            },

            isSelected: function () {
                return this.ui.setting.is(":checked");
            },

            serializeData: function() {
                var application = this.model.toJSON();
                application.selected = application.selectedByDefault;
                return {
                    application: application,
                    showInfoMessages: false
                };
            }
        });
});

define("jira/admin/application/defaults/ApplicationListView",
    ["jquery", "underscore", "backbone", "jira/admin/application/defaults/ApplicationView"],
    function($, _, Backbone, ApplicationView) {
        "use strict";
        var Marionette = Backbone.Marionette;

        var EmptyView = Marionette.ItemView.extend({
            template: JIRA.Templates.Admin.ApplicationAccessDefaults.listEmpty
        });

        return Marionette.CompositeView.extend({
            itemView: ApplicationView,
            itemViewContainer: ".application-picker-applications",

            emptyView: EmptyView,

            template: JIRA.Templates.Admin.ApplicationAccessDefaults.list,

            commit: function() {
                var $settings = this.$el.find('.application.checkbox');
                $settings.each(function (idx, checkbox) {
                    var $checkbox = $(checkbox);
                    var roleKey = $checkbox.data('key');
                    var selectedByDefault = $checkbox.is(":checked");
                    var roleModel = this.collection.get({id: roleKey});
                    if (roleModel.get("selectedByDefault") != selectedByDefault) {
                        roleModel.set("selectedByDefault", selectedByDefault);
                    }
                }.bind(this));

                return this.collection.updateDefaults();
            },

            onRender: function() {
                this.unwrapTemplate();
            }
        });
});


define("jira/admin/application/defaults/DialogView",
    ["jquery", "underscore", "backbone"],
    function ($, _, Backbone) {
        "use strict";
        var Marionette = Backbone.Marionette;

        var ErrorView = Marionette.ItemView.extend({
            template: JIRA.Templates.Admin.ApplicationAccessDefaults.showError
        });

        var WarningView = Marionette.ItemView.extend({
            serializeData: function() {
                return {
                    applications: this.options.applications
                };
            }
        });

        return Marionette.Layout.extend({
            ui: {
                submit: ".app-role-defaults-dialog-submit-button",
                close: ".app-role-defaults-dialog-close-button",
                iconWait: ".aui-dialog2-footer .aui-icon-wait",
                webPanels: ".app-role-defaults-web-panels"
            },

            regions: {
                errors: ".app-role-defaults-errors",
                warnings: ".app-role-defaults-warnings",
                contents: ".app-role-defaults-contents"
            },

            events: {
                "click @ui.submit": "formSubmit",
                "click @ui.close": "close"
            },

            template: JIRA.Templates.Admin.ApplicationAccessDefaults.dialog,

            onRender: function () {
                this.unwrapTemplate();

                this.dialog = AJS.dialog2(this.$el);
                this.dialog.on("hide", this.close.bind(this));
            },

            show: function () {
                this.dialog.show();
            },

            disable: function () {
                this.$(':input').prop("disabled", true);
            },

            enable: function () {
                this.$(':input').prop("disabled", false);
            },

            showContents: function (contentView) {
                this.contents.show(contentView);
                this.ui.webPanels.html(this.options.webPanels);
                this.showWarning();

                this.trigger("showContents");
                this.listenTo(contentView, "itemview:setting:changed", this.showWarning);
            },

            showWarning: function () {
                this.warnings.reset();

                var applicationsWithoutSeats = this._applicationsWithoutSeats();
                var applicationsWithoutDefaultGroup = this._applicationsWithoutDefaultGroup();

                // exceeded seat limit warning will override default groups warning
                if (applicationsWithoutSeats.length > 0) {
                    this.warnings.show(new WarningView({
                        template: JIRA.Templates.Admin.ApplicationAccessDefaults.noSeatsWarning,
                        applications: applicationsWithoutSeats
                    }));
                } else if (applicationsWithoutDefaultGroup.length > 0) {
                    this.warnings.show(new WarningView({
                        template: JIRA.Templates.Admin.ApplicationAccessDefaults.noDefaultGroupWarning,
                        applications: applicationsWithoutDefaultGroup
                    }));
                }
            },

            /**
             * Get selected items
             * @returns {Array.<ItemView>}
             * @private
             */
            _selectedItems: function() {
                return this.contents.currentView.children.filter(function(item) {
                    return item.isSelected();
                });
            },

            /**
             * Return applications that don't have default groups defined
             * @returns {Array}
             * @private
             */
            _applicationsWithoutDefaultGroup: function() {
                return this._selectedItems().filter(function(item) {
                    return _.isEmpty(item.model.get("defaultGroups"));
                }).map(function(item) {
                    return item.model.attributes;
                });
            },

            /**
             * Return applications that don't have any seats available are not type of unlimited license
             * @returns {Array}
             * @private
             */
            _applicationsWithoutSeats: function() {
                return this._selectedItems().filter(function(item) {
                    return item.model.get("remainingSeats") == 0
                        && !item.model.get("hasUnlimitedSeats");
                }).map(function(item) {
                    return item.model.attributes;
                });
            },

            formSubmit: function () {
                this.errors.reset();
                this.disable();
                this.ui.iconWait.removeClass("hidden");

                return this.contents.currentView.commit().done(function () {
                    this.close();
                }.bind(this)).fail(function () {
                    this.errors.show(new ErrorView());
                    this.enable();
                    this.ui.iconWait.addClass("hidden");
                }.bind(this));
            },

            onClose: function () {
                if (this.dialog.isVisible()) {
                    this.dialog.remove();
                }
            }
        });
    });

define("jira/admin/application/defaults",
    ["jquery", "underscore", "backbone", "jira/admin/application/defaults/DialogView",
        "jira/admin/application/defaults/ApplicationListView",
        "jira/admin/application/defaults/api"
    ],
    function ($, _, Backbone, DialogView, ApplicationListView, defaultsAPI) {
        var Marionette = Backbone.Marionette;

        return Marionette.Controller.extend({

            initialize: function(collection) {
                var webPanels = WRM.data.claim("com.atlassian.jira.web.action.admin.application-access:defapp-selector-webpanels");
                $('.app-role-defaults-show-button').on('click', function() {
                    var dialogView = new DialogView({
                        collection: collection,
                        webPanels: webPanels
                    });
                    dialogView.on("showContents", function () {
                        defaultsAPI.trigger(defaultsAPI.EVENT_ON_SHOW, dialogView);
                    });
                    dialogView.render();
                    dialogView.show();

                    dialogView.disable();
                    collection.whenFetched().then(function () {
                        dialogView.enable();
                        dialogView.showContents(new ApplicationListView({collection: collection}));
                    });
                }.bind(this));
            }
        });
    });
