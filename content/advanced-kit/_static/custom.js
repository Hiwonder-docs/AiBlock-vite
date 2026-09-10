function initMenu() {
    var nav_sidebar = document.querySelector('.wy-nav-side');
    var nav_search = nav_sidebar.querySelector('.wy-side-scroll .wy-side-nav-search');
    var returnLink = document.createElement('div');
    returnLink.innerHTML = `
        <div class="main-project-link" style="
            margin: 0 10px 10px 10px;
            background: #f8f9fa;
            border-radius: 4px;
        ">
            <a href="https://wiki.hiwonder.com/en/latest/"
               style="
                   display: block;
                   padding: 8px;
                   background: #343131;
                   color: white;
                   text-decoration: none;
                   border-radius: 4px;
                   font-weight: bold;
                   text-align: center;
                   transition: background 0.3s;
               ">
                ← Homepage
            </a>
        </div>
    `;

    let node = returnLink.firstElementChild;
    nav_search.insertBefore(node, nav_search.firstChild);

    // 绑定 hover
    let a = node.querySelector("a");
    a.addEventListener("mouseenter", () => a.style.background = "#F98800");
    a.addEventListener("mouseleave", () => a.style.background = "#343131");


    // 单页面菜单展开
    const alreadyItems = document.querySelector('.toctree-l2.current');
    if (alreadyItems) {
        alreadyItems.classList.remove('current');
        alreadyItems.classList.add('h-current');
    }

    // 事件委托绑定到父级
    const menuContainer = document.querySelector('.wy-menu-vertical > .current');
    if (menuContainer) {
        menuContainer.addEventListener('click', function(e) {
            const target = e.target.closest('.toctree-l2>a');
            if (target) {
                console.log(1);
                target.parentNode.classList.toggle('h-current');
            }
        });
    }

    // Download 标题
    const download_p = document.querySelector('.wy-menu-vertical > p:nth-of-type(2)');
    // 创建svg元素
    var i = document.createElement('i');
    var space = document.createTextNode(' ');
    i.className = 'fa fa-cloud-download';
    i.setAttribute('aria-hidden', 'true');
    // 将path添加到svg
    if (download_p){
        download_p.appendChild(space);
        download_p.appendChild(i);
        const download_lias = document.querySelectorAll('.wy-menu-vertical > ul:nth-of-type(2) > li.toctree-l1 a');
        download_lias.forEach(download_lia => {
            // 检查是否是目标链接
            if (download_lia) {
                download_lia.setAttribute('target', '_blank');
                // 将i插入到a标签的文本内容前面
                var new_i = document.createElement('i');
                var new_space = document.createTextNode(' ');
                new_i.className = 'fa fa-cloud-download';
                new_i.setAttribute('aria-hidden', 'true');
                download_lia.appendChild(new_space);
                download_lia.appendChild(new_i);
            }
        });
    }
}

// 根据场景选择执行时机
function sortVersionSelector() {
    const select = document.querySelector('.version-switch select');
    if (!select) {
        return false;
    }

    const versionOrder = new Map([
        ['latest', 0],
        ['starter-kit', 1],
        ['standard-kit', 2],
        ['ultimate-kit', 3],
    ]);
    const selectedValue = select.value;
    const options = Array.from(select.options).map((option, index) => ({
        option,
        index,
        rank: versionOrder.get(option.textContent.trim().toLowerCase())
            ?? Number.MAX_SAFE_INTEGER,
    }));

    options
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .forEach(({ option }) => select.appendChild(option));
    select.value = selectedValue;

    return true;
}

function initVersionSelector() {
    if (sortVersionSelector()) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (sortVersionSelector()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
}

if (document.readyState === 'complete') {
    initMenu();
    initVersionSelector();
} else {
    window.addEventListener('load', initMenu);
    window.addEventListener('load', initVersionSelector);
}
