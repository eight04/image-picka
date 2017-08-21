/* global pref */

(function(){
	var form = document.forms[0];
	var inputs = form.querySelectorAll("input");
	
	pref.bindElement(form, inputs);
})();
