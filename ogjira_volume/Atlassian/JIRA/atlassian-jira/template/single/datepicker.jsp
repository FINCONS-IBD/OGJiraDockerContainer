<%@ taglib uri="webwork" prefix="ww" %>
<jsp:include page="/template/single/controlheader.jsp" />
<input type="text"
       name="<ww:property value="parameters['name']"/>"
      <ww:property value="parameters['size']">
         <ww:if test=".">size="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['maxlength']">
         <ww:if test=".">maxlength="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['nameValue']">
         <ww:if test=".">value="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['disabled']">
         <ww:if test="{parameters['disabled']}">DISABLED</ww:if>
      </ww:property>
      <ww:property value="parameters['readonly']">
         <ww:if test="{parameters['readonly']}">READONLY</ww:if>
      </ww:property>
      <ww:property value="parameters['onkeyup']">
         <ww:if test=".">onkeyup="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['tabindex']">
         <ww:if test=".">tabindex="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['onchange']">
         <ww:if test=".">onchange="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['onfocus']">
         <ww:if test=".">onfocus="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['style']">
         <ww:if test=".">style="<ww:property value="."/>"</ww:if>
      </ww:property>
      <ww:property value="parameters['class']">
         <ww:if test=".">class="<ww:property value="."/>"</ww:if>
      </ww:property>
>
<a href="javascript:show_calendar('<%= request.getContextPath() %>', '<ww:property value="parameters['formname']" />', document.<ww:property value="parameters['formname']" />, '<ww:property value="parameters['name']" />');"><span class="icon-default aui-icon aui-icon-small aui-iconfont-calendar" title="<ww:text name="'date.picker.select.date'"/>"><ww:text name="'date.picker.select.date'"/></span></a>
<jsp:include page="/template/single/controlfooter.jsp" />
