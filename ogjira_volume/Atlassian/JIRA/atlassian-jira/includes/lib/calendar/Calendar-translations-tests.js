define("calendarTestHelper", [], function () {
    AJS.test.require("jira.webresources:calendar");

    return {

        runTests: function (locale, consts, requireMoment) {
                module("JIRA.list.calendar.Calendar" + (requireMoment ? "WithMoment" : "") + locale.toUpperCase() + "test", {
                    setup: function () {
                        this.consts = consts;
                        AJS.test.require("jira.webresources:calendar-" + locale);
                        if (requireMoment) {
                            AJS.test.require("jira.webresources:calendar-localisation-moment");
                        }
                        var fixtureID = "#qunit-fixture";
                        this.$input = jQuery("<input type='text'>").appendTo(fixtureID);
                        this.trigger = jQuery("<input type='button'>").appendTo(fixtureID)[0];

                        this.input = this.$input[0];
                        this.assertDaySelected = function (day) {
                            var $cal = jQuery(".calendar.active");
                            var $selectedDay = jQuery(".day-" + day + ".selected", $cal);
                            ok($selectedDay, "First day should be selected");
                            ok($selectedDay.length, "First day should be selected");
                        }
                    },
                    teardown: function () {
                        jQuery(".calendar").remove();
                        window.calendar = undefined;
                    }
                });
            test("test calendar selects proper date on open", function () {
                var date = new Date(2012, 0, 1);
                Calendar.setup({inputField: this.input, button: this.trigger, date: date, firstDay: 0});
                this.trigger.click();
                var $cal = jQuery(".calendar.active");
                ok($cal.length, "Calendar not present");
                ok($cal.is(":visible"), "Callendar should be visible");
                this.assertDaySelected(1);
                equal(jQuery(".title", $cal).text(), this.consts.longMonths[0] + ", 2012", "Expect proper header");
            });

            test("test calendar translation for day of week", function () {
                var date = new Date(2012, 1, 1);
                Calendar.setup({inputField: this.input, button: this.trigger, date: date, firstDay: 0});
                this.trigger.click();
                var days = jQuery(".name.day");
                equal(days.length, 7, "Expected that the week has seven days")
                for (var i = 0; i < 7; i++) {
                    equal(jQuery(days[i]).text(), this.consts.daysOfWeek[i], "Invalid week name");
                }
            });

            test("test calendar month changes properly by change of input field", function () {
                var date = new Date(2012, 1, 1);
                Calendar.setup({
                    inputField: this.input,
                    button: this.trigger,
                    ifFormat: "%d/%b/%y ",
                    date: date,
                    firstDay: 0
                });
                for (var i = 0; i < 12; i++) {
                    var date = "1/" + this.consts.shortMonths[i] + "/2012";
                    this.$input.val(date);
                    this.trigger.click();
                    this.assertDaySelected(1);
                    var $cal = jQuery(".calendar.active");
                    equal(jQuery(".title", $cal).text(), this.consts.longMonths[i] + ", 2012", "Expect proper header");
                }
            });

            test("test calendar month changes properly by js function", function () {
                Calendar.setup({inputField: this.input, button: this.trigger, firstDay: 0});
                this.trigger.click();
                for (var i = 0; i < 12; i++) {
                    window.calendar.setDate(new Date(2012, i, 1))
                    this.assertDaySelected(1);
                    var $cal = jQuery(".calendar.active");
                    equal(jQuery(".title", $cal).text(), this.consts.longMonths[i] + ", 2012", "Expect proper header");
                }
            });

            test("test calendar popup selects day by click ", function () {
                var date = new Date(2012, 1, 1);
                Calendar.setup({inputField: this.input, button: this.trigger, date: date, firstDay: 0});
                this.trigger.click();
                var $calendar = jQuery(".calendar.active");
                Calendar.dayMouseDown({currentTarget: jQuery(".day-3", $calendar)[0]})
                Calendar.tableMouseUp({target: jQuery(".day-3", $calendar)[0]})
                equal(this.$input.val(), "2012/02/03");
            });

            test("test calendar with 24 hour time mode ", function () {
                var hour = 16;
                var minute = 23;
                var date = new Date(2012, 1, 1, hour, minute, 12);
                Calendar.setup(
                    {
                        inputField: this.input,
                        button: this.trigger,
                        showsTime: true,
                        time24: true,
                        date: date, firstDay: 0
                    });
                this.trigger.click();
                var $cal = jQuery(".calendar.active");
                equal(jQuery(".time > .hour", $cal).text(), hour, "Invalid hour");
                equal(jQuery(".time > .minute", $cal).text(), minute, "Invalid minute");
            });
        }
    }
});

(function () {
    var calendarHelper = require("calendarTestHelper");
    calendarHelper.runTests("en", {
        daysOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        longMonths: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    });
    calendarHelper.runTests("jp", {
        daysOfWeek: ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"],
        shortMonths: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        longMonths: ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708", "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"]
    });
    calendarHelper.runTests("de", {
        daysOfWeek: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        shortMonths: ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
        longMonths: ["Januar", "Februar", "M\u00e4rz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    });
    calendarHelper.runTests("fr", {
        daysOfWeek: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
        shortMonths: ["janv.", "f\u00e9vr.", "mars", "avr.", "mai", "juin", "juil.", "ao\u00fbt", "sept.", "oct.", "nov.", "d\u00e9c."],
        longMonths: ["Janvier", "F\u00e9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\u00fbt", "Septembre", "Octobre", "Novembre", "D\u00e9cembre"]
    });
    calendarHelper.runTests("es", {
        daysOfWeek: ["Dom", "Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b"],
        shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
        longMonths: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    });

    //This test checks moment localisation which uses server generated month / weekday names.
    //As we do not have control over what server will send us, this method stubs WMR.data with some arbitrary month / weekday names
    //and checks if they have correctly overwritten calendar-js native localisation.
    //see moment.jira.i18n.js for details
    sinon.stub(WRM.data, "claim").withArgs('jira.webresources:dateFormatProvider.dateFormat').returns({
            months: ["M_One", "M_Two", "M_Three", "M_Four", "M_Five", "M_Six", "M_Seven", "M_Eight", "M_Nine", "M_Ten", "M_Eleven", "M_Twelve"],
            monthsShort: ["MS1", "MS2", "MS3", "MS4", "MS5", "MS6", "MS7", "MS8", "MS9", "MS10", "MS11", "MS12"],
            weekdays: ["WeekDay1", "WeekDay2", "WeekDay3", "WeekDay4", "WeekDay5", "WeekDay6", "WeekDay7"],
            weekdaysShort: ["WD1", "WD2", "WD3", "WD4", "WD5", "WD6", "WD7"]
        }
    )
    calendarHelper.runTests("en", {
        daysOfWeek: ["WD1", "WD2", "WD3", "WD4", "WD5", "WD6", "WD7"],
        shortMonths: ["MS1", "MS2", "MS3", "MS4", "MS5", "MS6", "MS7", "MS8", "MS9", "MS10", "MS11", "MS12"],
        longMonths: ["M_One", "M_Two", "M_Three", "M_Four", "M_Five", "M_Six", "M_Seven", "M_Eight", "M_Nine", "M_Ten", "M_Eleven", "M_Twelve"]
    }, true);

})();


