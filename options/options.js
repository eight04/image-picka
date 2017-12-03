/* global pref */

(function(){
	var form = document.forms[0];
	var inputs = form.querySelectorAll("input, textarea, select");
	
	pref.bindElement(form, inputs);
	
	pref.ready().then(() => {
		// checkbox supplement
		const fields = document.querySelectorAll("fieldset.checkbox-supplement");
		for (const field of fields) {
			const input = field.parentNode.querySelector(":scope > input");
			if (!input.checked) {
				field.disabled = true;
			}
			input.addEventListener("prefUpdate", onChange);
		}
		
		function onChange(e) {
			const input = e.target;
			const field = input.parentNode.querySelector(":scope > fieldset");
			if (!field) return;
			field.disabled = !input.checked;
		}
	});
	
	browser.runtime.getBrowserInfo()
		.then(({version}) => {
			if (+version.split(".")[0] < 57) {
				document.body.classList.add("version-lt-57");
			}
		});
})();
