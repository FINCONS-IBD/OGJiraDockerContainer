AJS.test.require(["jira.webresources:jira-global"], function() {

    var Meta = AJS.Meta;
    var NumberFormatter;

    module("JIRA.NumberFormatter", {
        setup: function () {
            this.metaGetStub = sinon.stub(Meta, 'get');
            NumberFormatter = JIRA.NumberFormatter;
        },

        teardown: function () {
            this.metaGetStub.restore();
        }
    });

    test("Format integers", function () {
        this.metaGetStub.withArgs('user-locale-group-separator').returns(',');
        equal(NumberFormatter.format(1234), "1,234");
        equal(NumberFormatter.format(12345), "12,345");
        equal(NumberFormatter.format(123456), "123,456");
        equal(NumberFormatter.format(1234567), "1,234,567");
        equal(NumberFormatter.format(-1234567), "-1,234,567");

        this.metaGetStub.withArgs('user-locale-group-separator').returns('.');
        equal(NumberFormatter.format(1234567), "1.234.567");

        this.metaGetStub.withArgs('user-locale-group-separator').returns('');
        equal(NumberFormatter.format(1234567), "1234567");
    });
});
