/* Таблица «Элементы узоров / Значение цветов» на странице patterns.html.
 *
 * Сверху выбирается, что рассматривать (узоры или цвета). Слева показываются кнопки-образцы,
 * при нажатии на кнопку справа появляется информация о выбранном элементе.
 *
 * ВСЕ ТЕКСТЫ И ЦВЕТА — в объекте DATA ниже: можно свободно менять названия и описания,
 * добавлять и удалять элементы (кнопок может быть сколько угодно, они выстраиваются по 4 в ряд).
 *
 * РАЗНОВИДНОСТИ: у любого узора можно добавить список varieties — под таблицей появятся карточки
 * «Разновидности элемента». Если списка нет, блок под таблицей скрыт.
 *   varieties: [
 *     { name: 'Название', text: 'Описание', svg: ICONS.something },          // рисунок из SVG-кода
 *     { name: 'Название', text: 'Описание', image: './images/varieties/x.svg' } // или из файла (svg/png)
 *   ]
 */
(function () {
    'use strict';

    var root = document.getElementById('patternsExplorer');
    if (!root) return;

    /* ---------- рисунки разновидностей (SVG, цвет берётся из CSS) ---------- */

    function icon(inner, extra) {
        return '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="miter" ' +
               (extra || '') + ' aria-hidden="true" focusable="false">' + inner + '</svg>';
    }
    var ICONS = {
        // два вложенных ромба с точкой в центре
        womb: icon('<polygon points="50,5 95,50 50,95 5,50"/><polygon points="50,25 75,50 50,75 25,50" stroke-width="4.5"/><g fill="currentColor" stroke="none"><circle cx="50" cy="50" r="7"/></g>'),
        // ромб, разделённый крестом на четыре части, в каждой точка
        field: icon('<polygon points="50,8 92,50 50,92 8,50"/><path d="M19 19L81 81M81 19L19 81"/><g fill="currentColor" stroke="none"><circle cx="50" cy="29" r="5"/><circle cx="71" cy="50" r="5"/><circle cx="50" cy="71" r="5"/><circle cx="29" cy="50" r="5"/></g>'),
        // большой косой крест и четыре ромба
        makosh: icon('<path d="M6 6L94 94M94 6L6 94"/><g stroke-width="4.5"><polygon points="50,11 64,25 50,39 36,25"/><polygon points="11,50 25,36 39,50 25,64"/><polygon points="89,50 75,36 61,50 75,64"/><polygon points="50,89 64,75 50,61 36,75"/></g>'),
        // зерно
        seed: icon('<path d="M50 6Q82 50 50 94Q18 50 50 6Z"/><path d="M50 28V72" stroke-width="4"/>'),
        // горсть зёрен
        grains: icon('<g fill="currentColor" stroke="none"><circle cx="24" cy="24" r="6"/><circle cx="50" cy="24" r="6"/><circle cx="76" cy="24" r="6"/><circle cx="24" cy="50" r="6"/><circle cx="50" cy="50" r="6"/><circle cx="76" cy="50" r="6"/><circle cx="24" cy="76" r="6"/><circle cx="50" cy="76" r="6"/><circle cx="76" cy="76" r="6"/></g>'),
        // решётка из ромбов
        lattice: icon('<polygon points="50,6 94,50 50,94 6,50"/><path d="M28 28L72 72M72 28L28 72"/>'),
        // прямой крест
        cross: icon('<path d="M50 8V92M8 50H92"/><polygon points="50,39 61,50 50,61 39,50" fill="currentColor" stroke="none"/>'),
        // косой крест
        crossX: icon('<path d="M14 14L86 86M86 14L14 86"/><g fill="currentColor" stroke="none"><circle cx="50" cy="50" r="7"/></g>'),
        // крест в ромбе
        crossDiamond: icon('<polygon points="50,6 94,50 50,94 6,50"/><path d="M50 28V72M28 50H72"/>'),
        // восьмилучевая звезда
        star8: icon('<path d="M60.0 50.0L92.0 50.0M57.1 57.1L79.7 79.7M50.0 60.0L50.0 92.0M42.9 57.1L20.3 79.7M40.0 50.0L8.0 50.0M42.9 42.9L20.3 20.3M50.0 40.0L50.0 8.0M57.1 42.9L79.7 20.3" stroke-width="4.5"/><g fill="currentColor" stroke="none"><circle cx="50" cy="50" r="8"/></g>'),
        // розетка
        rosette: icon('<circle cx="50" cy="50" r="17"/><path d="M77.0 50.0L94.0 50.0M69.1 69.1L81.1 81.1M50.0 77.0L50.0 94.0M30.9 69.1L18.9 81.1M23.0 50.0L6.0 50.0M30.9 30.9L18.9 18.9M50.0 23.0L50.0 6.0M69.1 30.9L81.1 18.9" stroke-width="4.5"/><g fill="currentColor" stroke="none"><circle cx="50" cy="50" r="6"/></g>'),
        // звезда в ромбе
        starDiamond: icon('<polygon points="50,6 94,50 50,94 6,50"/><path d="M58.0 50.0L76.0 50.0M55.7 55.7L68.4 68.4M50.0 58.0L50.0 76.0M44.3 55.7L31.6 68.4M42.0 50.0L24.0 50.0M44.3 44.3L31.6 31.6M50.0 42.0L50.0 24.0M55.7 44.3L68.4 31.6" stroke-width="4"/><circle cx="50" cy="50" r="4" fill="currentColor" stroke="none"/>'),
        // ёлочка
        fir: icon('<path d="M24.0 38.0L50.0 14.0L76.0 38.0M16.0 60.0L50.0 30.0L84.0 60.0M8.0 82.0L50.0 46.0L92.0 82.0M50.0 82.0V94.0"/>'),
        // две ёлочки
        fir2: icon('<path stroke-width="4.5" d="M12.0 44.0L25.0 32.0L38.0 44.0M8.0 55.0L25.0 40.0L42.0 55.0M4.0 66.0L25.0 48.0L46.0 66.0M25.0 66.0V72.0M62.0 44.0L75.0 32.0L88.0 44.0M58.0 55.0L75.0 40.0L92.0 55.0M54.0 66.0L75.0 48.0L96.0 66.0M75.0 66.0V72.0"/>'),
        // колосок
        ear: icon('<path d="M50 94V8M50 30L34 14M50 30L66 14M50 50L30 30M50 50L70 30M50 70L26 46M50 70L74 46"/>'),
        // зигзаг
        zig: icon('<path d="M6 62L28 38L50 62L72 38L94 62"/>'),
        // двойной зигзаг
        zig2: icon('<path d="M6 48L28 24L50 48L72 24L94 48M6 78L28 54L50 78L72 54L94 78"/>'),
        // молния
        bolt: icon('<path d="M64 6L30 52H58L36 94"/>'),
        // волна
        wave: icon('<path d="M6 50Q28 20 50 50T94 50"/>'),
        // двойная волна
        wave2: icon('<path d="M6 36Q28 8 50 36T94 36M6 68Q28 40 50 68T94 68"/>'),
        // волна с каплями
        rain: icon('<path d="M6 36Q28 8 50 36T94 36"/><g fill="currentColor" stroke="none"><circle cx="28" cy="66" r="5.5"/><circle cx="50" cy="82" r="5.5"/><circle cx="72" cy="66" r="5.5"/></g>'),
        // древо жизни
        tree: icon('<path d="M50 94V16M50 40L30 22M50 40L70 22M50 62L26 42M50 62L74 42M30 94H70"/><g fill="currentColor" stroke="none"><circle cx="50" cy="9" r="5"/></g>'),
        // древо с плодами
        treeFruit: icon('<path d="M50 94V20M50 40L30 26M50 40L70 26M50 64L26 46M50 64L74 46M30 94H70"/><g fill="currentColor" stroke="none"><circle cx="50" cy="14" r="6"/><circle cx="28" cy="24" r="6"/><circle cx="72" cy="24" r="6"/><circle cx="24" cy="44" r="6"/><circle cx="76" cy="44" r="6"/></g>'),
        // мировое древо
        world: icon('<polygon points="50,6 74,28 50,50 26,28"/><path d="M50 50V72M50 72L28 94M50 72V94M50 72L72 94"/>')
    };

    /* ---------- данные ---------- */

    var DATA = {
        patterns: {
            kind: 'Узор',
            groupLabel: 'Элементы узоров',
            items: [
                {
                    name: 'Ромб',
                    text: 'Ромб — один из самых древних и распространённых знаков народного орнамента. Он связан с землёй, полем и плодородием.',
                    varieties: [
                        {
                            name: 'Чрево Земли-Матушки',
                            text: 'Чрево женщины и Чрево Матушки-Земли, заполненный семенем,пространство познания. Чрево заполненное земля с семенем. Солнце - смотря на Солнце, люди созерцают семя Богов.',
                            svg: ICONS.womb
                        },
                        {
                            name: 'Засеянное поле',
                            text: 'Один из главных древнейших символов, означало достаток и богатство, процветание и успех. Позволяет увеличить жизненные силы человека, сделать его увереннее в себе, усиливает способности к деторождению.',
                            svg: ICONS.field
                        },
                        {
                            name: 'Макошь',
                            text: 'Небесная Богородица, Справедливая Богиня счастливого Жребия и Судьбы. Покровительница плодородия и урожая.',
                            svg: ICONS.makosh
                        }
                    ],
                    art: [
                        '.....#.....',
                        '....#.#....',
                        '...#...#...',
                        '..#.....#..',
                        '.#.......#.',
                        '#....#....#',
                        '.#.......#.',
                        '..#.....#..',
                        '...#...#...',
                        '....#.#....',
                        '.....#.....'
                    ]
                },
                {
                    name: 'Ромб с зёрнами',
                    text: 'Ромб, заполненный «зёрнами», связывали с засеянным полем. Такой узор был пожеланием хорошего урожая и достатка в доме.',
                    varieties: [
                        {
                            name: 'Зерно',
                            text: 'Одно зерно — образ начала и будущего урожая. Его вплетали как пожелание, чтобы дело принесло плоды.',
                            svg: ICONS.seed
                        },
                        {
                            name: 'Горсть зёрен',
                            text: 'Несколько зёрен вместе означали достаток: чем больше зёрен, тем богаче будет урожай.',
                            svg: ICONS.grains
                        },
                        {
                            name: 'Решётка',
                            text: 'Ромбы, сложенные в сетку, напоминали поле, разделённое на участки. Такой узор связывали с землёй и трудом земледельца.',
                            svg: ICONS.lattice
                        }
                    ],
                    art: [
                        '.....#.....',
                        '....###....',
                        '...##.##...',
                        '..##.#.##..',
                        '.##.#.#.##.',
                        '##.#.#.#.##',
                        '.##.#.#.##.',
                        '..##.#.##..',
                        '...##.##...',
                        '....###....',
                        '.....#.....'
                    ]
                },
                {
                    name: 'Крест',
                    text: 'Равносторонний крест — знак солнца и движения жизни. Узоры с крестом ткали как оберег.',
                    varieties: [
                        {
                            name: 'Прямой крест',
                            text: 'Равносторонний крест с одинаковыми лучами связывали с четырьмя сторонами света и движением солнца. Его ткали как оберег.',
                            svg: ICONS.cross
                        },
                        {
                            name: 'Косой крест',
                            text: 'Косой крест, похожий на букву «X», — один из самых простых охранных знаков. Его легко повторять рядами, поэтому он часто встречается в каймах и полосах.',
                            svg: ICONS.crossX
                        },
                        {
                            name: 'Крест в ромбе',
                            text: 'Крест, вписанный в ромб, соединяет знак солнца и знак земли. Считалось, что такой узор приносит в дом тепло и достаток.',
                            svg: ICONS.crossDiamond
                        }
                    ],
                    art: [
                        '.....#.....',
                        '.....#.....',
                        '.....#.....',
                        '.....#.....',
                        '....###....',
                        '###########',
                        '....###....',
                        '.....#.....',
                        '.....#.....',
                        '.....#.....',
                        '.....#.....'
                    ]
                },
                {
                    name: 'Звезда-розетка',
                    text: 'Звезда с лучами во все стороны напоминает солнце. Её ткали как оберег и как пожелание света и тепла.',
                    varieties: [
                        {
                            name: 'Восьмилучевая звезда',
                            text: 'Лучи расходятся от центра во все стороны, как свет от солнца. Такую звезду ткали как оберег и пожелание света и тепла.',
                            svg: ICONS.star8
                        },
                        {
                            name: 'Розетка',
                            text: 'Круг с лучами — упрощённый образ цветка и солнца. Розетку любили помещать в центр узора.',
                            svg: ICONS.rosette
                        },
                        {
                            name: 'Звезда в ромбе',
                            text: 'Звезда внутри ромба соединяет небесное и земное: свет солнца освещает поле и приносит урожай.',
                            svg: ICONS.starDiamond
                        }
                    ],
                    art: [
                        '#....#....#',
                        '.#...#...#.',
                        '..#..#..#..',
                        '...#.#.#...',
                        '....###....',
                        '###########',
                        '....###....',
                        '...#.#.#...',
                        '..#..#..#..',
                        '.#...#...#.',
                        '#....#....#'
                    ]
                },
                {
                    name: 'Ёлочка',
                    text: 'Ёлочка — знак жизни, стойкости и защиты: вечнозелёное дерево не теряет хвою даже зимой.',
                    varieties: [
                        {
                            name: 'Ёлочка',
                            text: 'Одиночная ёлочка — знак жизни и стойкости: вечнозелёное дерево не теряет хвою даже зимой.',
                            svg: ICONS.fir
                        },
                        {
                            name: 'Двойная ёлочка',
                            text: 'Две ёлочки рядом — образ пары и согласия. Повторяясь, они складываются в ряд, похожий на лес.',
                            svg: ICONS.fir2
                        },
                        {
                            name: 'Колосок',
                            text: 'Ёлочка с ветвями, расходящимися от стебля, напоминает колос. Такой узор связывали с урожаем и достатком.',
                            svg: ICONS.ear
                        }
                    ],
                    art: [
                        '.....#.....',
                        '....###....',
                        '...#####...',
                        '....###....',
                        '...#####...',
                        '..#######..',
                        '...#####...',
                        '..#######..',
                        '.#########.',
                        '.....#.....',
                        '.....#.....'
                    ]
                },
                {
                    name: 'Зигзаг',
                    text: 'Ломаная линия — один из знаков воды и дороги. Повторяющийся зигзаг часто использовали в каймах и полосах.',
                    varieties: [
                        {
                            name: 'Зигзаг',
                            text: 'Ломаная линия — знак воды и дороги. Она показывает движение вперёд с поворотами.',
                            svg: ICONS.zig
                        },
                        {
                            name: 'Двойной зигзаг',
                            text: 'Две параллельные ломаные линии усиливали значение знака. Такой узор часто использовали в каймах.',
                            svg: ICONS.zig2
                        },
                        {
                            name: 'Молния',
                            text: 'Зигзаг, похожий на молнию, связывали с грозой, дождём и небесной силой.',
                            svg: ICONS.bolt
                        }
                    ],
                    art: [
                        '..#...#...#',
                        '.#.#.#.#.#.',
                        '#...#...#..',
                        '...........',
                        '..#...#...#',
                        '.#.#.#.#.#.',
                        '#...#...#..',
                        '...........',
                        '..#...#...#',
                        '.#.#.#.#.#.',
                        '#...#...#..'
                    ]
                },
                {
                    name: 'Волна',
                    text: 'Волнистая линия — знак воды, дождя и течения жизни. Воду в народных представлениях связывали с плодородием.',
                    varieties: [
                        {
                            name: 'Волна',
                            text: 'Плавная волнистая линия — знак воды и течения жизни.',
                            svg: ICONS.wave
                        },
                        {
                            name: 'Двойная волна',
                            text: 'Две волны одна под другой — образ большой воды: реки или озера.',
                            svg: ICONS.wave2
                        },
                        {
                            name: 'Волна с каплями',
                            text: 'Капли под волной означали дождь. Воду в народных представлениях связывали с плодородием.',
                            svg: ICONS.rain
                        }
                    ],
                    art: [
                        '....##....#',
                        '#..#..#..#.',
                        '.##....##..',
                        '...........',
                        '....##....#',
                        '#..#..#..#.',
                        '.##....##..',
                        '...........',
                        '....##....#',
                        '#..#..#..#.',
                        '.##....##..'
                    ]
                },
                {
                    name: 'Древо жизни',
                    text: 'Древо жизни соединяет землю и небо. Оно олицетворяет рост, продолжение рода и благополучие семьи.',
                    varieties: [
                        {
                            name: 'Древо жизни',
                            text: 'Ствол с ветвями, поднимающимися вверх, — образ роста и продолжения рода.',
                            svg: ICONS.tree
                        },
                        {
                            name: 'Древо с плодами',
                            text: 'Плоды на ветвях — пожелание достатка, здоровья и крепкой семьи.',
                            svg: ICONS.treeFruit
                        },
                        {
                            name: 'Мировое древо',
                            text: 'Корни уходят в землю, крона тянется к небу: дерево соединяет нижний, средний и верхний миры.',
                            svg: ICONS.world
                        }
                    ],
                    art: [
                        '.....#.....',
                        '....###....',
                        '...#.#.#...',
                        '..#..#..#..',
                        '...#.#.#...',
                        '....###....',
                        '.....#.....',
                        '.....#.....',
                        '..#..#..#..',
                        '...#####...',
                        '.....#.....'
                    ]
                }
            ]
        },

        colors: {
            kind: 'Цвет',
            groupLabel: 'Значение цветов',
            items: [
                {
                    name: 'Красный',
                    color: '#D10000',
                    text: 'Символизировал жизненную энергию, огонь, солнце. В славянской символике огонь и есть солнце, поэтому наравне со светилом он давал здоровье, совершенство, тепло, защищал от дурных глаз.'
                },
                {
                    name: 'Белый',
                    color: '#F7F2E8',
                    text: 'Цвет чистоты, света и добрых помыслов. В народной традиции белое связывали с рождением, обновлением и началом нового.'
                },
                {
                    name: 'Чёрный',
                    color: '#231D1B',
                    text: 'Цвет земли и плодородия. В узорах чёрный давал контраст и подчёркивал яркие цвета.'
                },
                {
                    name: 'Синий',
                    color: '#2D4C9B',
                    text: 'Цвет неба и воды. Символизировал истину, верность и спокойствие.'
                },
                {
                    name: 'Зелёный',
                    color: '#41803B',
                    text: 'Цвет растительности и весеннего пробуждения природы. Означал жизнь, рост и обновление.'
                },
                {
                    name: 'Жёлтый',
                    color: '#EBC016',
                    text: 'Цвет солнца и спелого хлеба. Связывался с теплом, богатством и достатком.'
                },
                {
                    name: 'Оранжевый',
                    color: '#E4780F',
                    text: 'Цвет огня и тепла, соединяющий красный и жёлтый. Означал радость и жизненную силу.'
                },
                {
                    name: 'Коричневый',
                    color: '#7A4A2A',
                    text: 'Цвет земли и дерева. Напоминал о доме, труде и надёжной опоре.'
                }
            ]
        }
    };

    /* ---------- элементы страницы ---------- */

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
    var grid = root.querySelector('.patterns-explorer__grid');
    var panel = root.querySelector('.patterns-explorer__body');
    var info = root.querySelector('.patterns-explorer__info');
    var swatch = root.querySelector('.patterns-explorer__swatch');
    var kindEl = root.querySelector('.patterns-explorer__kind');
    var nameEl = root.querySelector('.patterns-explorer__name');
    var descEl = root.querySelector('.patterns-explorer__desc');
    var varSection = root.querySelector('.patterns-varieties');          // блок «Разновидности элемента» под таблицей
    var varList = root.querySelector('.patterns-varieties__list');
    var varCount = root.querySelector('.patterns-varieties__count');

    var current = null;                      // 'patterns' | 'colors'
    var selected = { patterns: 0, colors: 0 };   // запоминаем выбор на каждой вкладке

    /* ---------- рисование узора из строк «#» и «.» ---------- */

    function artToSvg(rows) {
        var h = rows.length, w = rows[0].length, d = '';
        rows.forEach(function (row, y) {
            var x = 0;
            while (x < w) {
                if (row.charAt(x) === '#') {
                    var x0 = x;
                    while (x < w && row.charAt(x) === '#') x++;
                    d += 'M' + x0 + ' ' + y + 'h' + (x - x0) + 'v1h-' + (x - x0) + 'z';
                } else x++;
            }
        });
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
    }

    /* ---------- отрисовка ---------- */

    function renderGrid() {
        var set = DATA[current];
        grid.setAttribute('aria-label', set.groupLabel);
        grid.innerHTML = '';
        set.items.forEach(function (item, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'patterns-explorer__item';
            b.setAttribute('aria-label', item.name);
            b.title = item.name;
            if (item.color) {
                b.classList.add('patterns-explorer__item--color');
                b.style.setProperty('--swatch', item.color);
            } else {
                b.innerHTML = artToSvg(item.art);
            }
            b.addEventListener('click', function () { select(i); });
            grid.appendChild(b);
        });
    }

    function renderInfo() {
        var set = DATA[current], item = set.items[selected[current]];
        if (item.color) {
            swatch.className = 'patterns-explorer__swatch patterns-explorer__swatch--color';
            swatch.style.setProperty('--swatch', item.color);
            swatch.innerHTML = '';
        } else {
            swatch.className = 'patterns-explorer__swatch patterns-explorer__swatch--pattern';
            swatch.style.removeProperty('--swatch');
            swatch.innerHTML = artToSvg(item.art);
        }
        kindEl.textContent = set.kind;
        nameEl.textContent = item.name;
        descEl.textContent = item.text;
        // короткая анимация смены описания
        info.classList.remove('is-changing');
        void info.offsetWidth;
        info.classList.add('is-changing');
    }

    function plural(n, one, few, many) {
        var m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }

    // разновидности показываем только для узоров и только если они заданы
    function renderVarieties() {
        if (!varSection) return;
        var item = DATA[current].items[selected[current]];
        var list = current === 'patterns' && item.varieties;
        if (!list || !list.length) { varSection.hidden = true; return; }

        varCount.textContent = list.length + ' ' + plural(list.length, 'элемент', 'элемента', 'элементов');
        varList.innerHTML = '';
        list.forEach(function (v, i) {
            var li = document.createElement('li');
            li.className = 'patterns-variety' + (i % 2 ? ' patterns-variety--reverse' : '');

            var art = document.createElement('div');
            art.className = 'patterns-variety__art';
            if (v.svg) art.innerHTML = v.svg;
            else if (v.image) {
                var img = document.createElement('img');
                img.src = v.image; img.alt = ''; img.loading = 'lazy';
                art.appendChild(img);
            }

            var body = document.createElement('div');
            body.className = 'patterns-variety__body';
            var h = document.createElement('h4');
            h.className = 'patterns-variety__name';
            h.textContent = v.name;
            var t = document.createElement('p');
            t.className = 'patterns-variety__text';
            t.textContent = v.text;
            body.appendChild(h); body.appendChild(t);

            li.appendChild(art); li.appendChild(body);
            varList.appendChild(li);
        });
        varSection.hidden = false;
        varSection.classList.remove('is-changing');
        void varSection.offsetWidth;
        varSection.classList.add('is-changing');
    }

    function markSelected() {
        var buttons = grid.children;
        for (var i = 0; i < buttons.length; i++) {
            var on = i === selected[current];
            buttons[i].classList.toggle('is-selected', on);
            buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    }

    function select(i) {
        selected[current] = i;
        markSelected();
        renderInfo();
        renderVarieties();
    }

    function activate(name, focusTab) {
        if (!DATA[name]) return;
        current = name;
        tabs.forEach(function (t) {
            var on = t.getAttribute('data-tab') === name;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            if (on) { panel.setAttribute('aria-labelledby', t.id); if (focusTab) t.focus(); }
        });
        renderGrid();
        markSelected();
        renderInfo();
        renderVarieties();
    }

    /* ---------- события ---------- */

    tabs.forEach(function (t, idx) {
        t.addEventListener('click', function () { activate(t.getAttribute('data-tab')); });
        t.addEventListener('keydown', function (e) {          // стрелки переключают вкладки
            var to = -1;
            if (e.key === 'ArrowRight') to = (idx + 1) % tabs.length;
            else if (e.key === 'ArrowLeft') to = (idx - 1 + tabs.length) % tabs.length;
            else if (e.key === 'Home') to = 0;
            else if (e.key === 'End') to = tabs.length - 1;
            if (to >= 0) { e.preventDefault(); activate(tabs[to].getAttribute('data-tab'), true); }
        });
    });

    // какая вкладка открыта при загрузке страницы: data-initial-tab="colors" или "patterns" на <section>
    var initial = root.getAttribute('data-initial-tab');
    activate(DATA[initial] ? initial : 'patterns');
})();