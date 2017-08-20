/* global pref */

(function(){
	var form = document.forms[0];
	var inputs = form.querySelectorAll("input");
	inputs = new Map(Array.from(inputs).map(i => [i.id, i]));
	
	pref.onChange(update);
	pref.ready().then(() => {
		update(pref.get());
	});
	
	form.onchange = e => {
		var input = e.target,
			id = input.id,
			value;
		if (input.type == "checkbox") {
			value = input.checked;
		} else {
			value = input.value;
		}
		pref.set(id, value);
	};
	
	function update(prefs) {
		for (var [id, input] of inputs.entries()) {
			if (prefs[id] != null) {
				if (input.type == "checkbox") {
					input.checked = prefs[id];
				} else {
					input.value = prefs[id];
				}
			}
		}
	}

})();
