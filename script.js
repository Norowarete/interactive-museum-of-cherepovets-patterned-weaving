(function () {
    var burger = document.getElementById('burgerBtn');
    var menuList = document.getElementById('headerMenuList');
    var overlay = document.getElementById('navOverlay');

    if (!burger || !menuList || !overlay) return;

    function openMenu() {
        menuList.classList.add('is-open');
        overlay.classList.add('is-open');
        burger.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Закрыть меню');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeydown);
    }

    function closeMenu() {
        menuList.classList.remove('is-open');
        overlay.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Открыть меню');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKeydown);
        // заодно закрываем все раскрытые подменю внутри панели
        document.querySelectorAll('.header-menu-item.is-open').forEach(closeDropdown);
    }

    function onKeydown(e) {
        if (e.key === 'Escape') closeMenu();
    }

    burger.addEventListener('click', function () {
        menuList.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    // при обычной навигации по ссылке меню тоже логично закрыть —
    // кроме ссылок-триггеров подменю, у них свой обработчик ниже
    menuList.querySelectorAll('.header-menu-link').forEach(function (link) {
        var isDropdownTrigger = link.parentElement.classList.contains('has-dropdown');
        link.addEventListener('click', function () {
            if (isDropdownTrigger) return;
            if (menuList.classList.contains('is-open')) closeMenu();
        });
    });

    // если пользователь развернул окно обратно на десктоп — сбрасываем мобильное состояние
    window.addEventListener('resize', function () {
        if (window.innerWidth > 880 && menuList.classList.contains('is-open')) {
            closeMenu();
        }
    });

    /* ---- выпадающие подменю: клик по самому названию (актуально на мобильном) ---- */

    var mobileQuery = window.matchMedia('(max-width: 880px)');

    function openDropdown(li) {
        li.classList.add('is-open');
        li.querySelector(':scope > .header-menu-link').setAttribute('aria-expanded', 'true');
    }

    function closeDropdown(li) {
        li.classList.remove('is-open');
        li.querySelector(':scope > .header-menu-link').setAttribute('aria-expanded', 'false');
    }

    document.querySelectorAll('.header-menu-item.has-dropdown').forEach(function (li) {
        var link = li.querySelector(':scope > .header-menu-link');
        link.addEventListener('click', function (e) {
            // на десктопе (шире 880px) ссылка работает как обычно, подменю открывается по hover/focus
            if (!mobileQuery.matches) return;
            e.preventDefault();
            li.classList.contains('is-open') ? closeDropdown(li) : openDropdown(li);
        });
    });
})();

(function () {
    var breadcrumbs = document.getElementById('breadcrumbs');

    if (!breadcrumbs) return;

    // Названия страниц и их адреса
    var pages = {
        'index.html': 'Главная',
        'history.html': 'История',
        'archive.html': 'Архив',
        'patterns.html': 'Узоры',
        'technology.html': 'Технология',
        'art_laboratory.html': 'Художественная лаборатория',
        'for_visitors.html': 'Для посетителей',
        'about_us.html': 'О нас'
    };

    var currentFile = window.location.pathname.split('/').pop();

    if (!currentFile) {
        currentFile = 'index.html';
    }

    var currentName = pages[currentFile];

    // Не показываем крошки для неизвестных страниц
    if (!currentName) return;

    var history = JSON.parse(
        sessionStorage.getItem('breadcrumbHistory') || '[]'
    );

    // Если открыли главную, начинаем историю заново
    if (currentFile === 'index.html') {
        history = [];
    }

    // Если перешли на другую страницу, добавляем её
    if (history.length === 0 ||
        history[history.length - 1].file !== currentFile) {
        history.push({
            file: currentFile,
            name: currentName
        });
    }

    // Если вернулись на предыдущую страницу,
    // убираем последующие страницы из цепочки
    var currentIndex = history.findIndex(function (page) {
        return page.file === currentFile;
    });

    if (currentIndex !== -1) {
        history = history.slice(0, currentIndex + 1);
    }

    sessionStorage.setItem(
        'breadcrumbHistory',
        JSON.stringify(history)
    );

    // Рисуем хлебные крошки
    history.forEach(function (page, index) {
        if (index > 0) {
            var separator = document.createElement('span');
            separator.textContent = '→';
            separator.setAttribute('aria-hidden', 'true');
            breadcrumbs.appendChild(separator);
        }

        if (index === history.length - 1) {
            var current = document.createElement('span');
            current.className = 'breadcrumbs-current';
            current.textContent = page.name;
            current.setAttribute('aria-current', 'page');
            breadcrumbs.appendChild(current);
        } else {
            var link = document.createElement('a');
            link.href = page.file;
            link.textContent = page.name;
            breadcrumbs.appendChild(link);
        }
    });
})();