/* exported webextMenus */

function webextMenus(menus) {
	const dynamicMenus = [];
	
	for (const menu of menus) {
		if (menu.oncontext) {
			dynamicMenus.push(menu);
			menu.show = false;
		} else {
			create(menu);
		}
	}
	
	function create(menu) {
		return browser.contextMenus.create({
			title: menu.title,
			contexts: menu.contexts,
			onclick: menu.onclick
		});
	}
	
	function update() {
		for (const menu of dynamicMenus) {
			const shouldShow = Boolean(menu.oncontext());
			if (menu.show === shouldShow) continue;
			
			menu.show = shouldShow;
			if (shouldShow) {
				menu.id = create(menu);
			} else {
				browser.contextMenus.remove(menu.id);
			}
		}
	}
	
	return {update};
}
