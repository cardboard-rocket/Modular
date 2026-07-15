import{P as l}from"./prism-okaidia-z7NgJy7m.js";import"./prism-cpp-nxIg4ZzG.js";import{_ as u,c as d,a as r,F as h,r as f,t as p,f as c,b as _,o as m,n as g}from"./index-5qFO5Xkw.js";(function(t){var n="\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b",i={pattern:/(^(["']?)\w+\2)[ \t]+\S.*/,lookbehind:!0,alias:"punctuation",inside:null},s={bash:i,environment:{pattern:RegExp("\\$"+n),alias:"constant"},variable:[{pattern:/\$?\(\([\s\S]+?\)\)/,greedy:!0,inside:{variable:[{pattern:/(^\$\(\([\s\S]+)\)\)/,lookbehind:!0},/^\$\(\(/],number:/\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,operator:/--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,punctuation:/\(\(?|\)\)?|,|;/}},{pattern:/\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,greedy:!0,inside:{variable:/^\$\(|^`|\)$|`$/}},{pattern:/\$\{[^}]+\}/,greedy:!0,inside:{operator:/:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,punctuation:/[\[\]]/,environment:{pattern:RegExp("(\\{)"+n),lookbehind:!0,alias:"constant"}}},/\$(?:\w+|[#?*!@$])/],entity:/\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/};t.languages.bash={shebang:{pattern:/^#!\s*\/.*/,alias:"important"},comment:{pattern:/(^|[^"{\\$])#.*/,lookbehind:!0},"function-name":[{pattern:/(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,lookbehind:!0,alias:"function"},{pattern:/\b[\w-]+(?=\s*\(\s*\)\s*\{)/,alias:"function"}],"for-or-select":{pattern:/(\b(?:for|select)\s+)\w+(?=\s+in\s)/,alias:"variable",lookbehind:!0},"assign-left":{pattern:/(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,inside:{environment:{pattern:RegExp("(^|[\\s;|&]|[<>]\\()"+n),lookbehind:!0,alias:"constant"}},alias:"variable",lookbehind:!0},parameter:{pattern:/(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,alias:"variable",lookbehind:!0},string:[{pattern:/((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,lookbehind:!0,greedy:!0,inside:s},{pattern:/((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,lookbehind:!0,greedy:!0,inside:{bash:i}},{pattern:/(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,lookbehind:!0,greedy:!0,inside:s},{pattern:/(^|[^$\\])'[^']*'/,lookbehind:!0,greedy:!0},{pattern:/\$'(?:[^'\\]|\\[\s\S])*'/,greedy:!0,inside:{entity:s.entity}}],environment:{pattern:RegExp("\\$?"+n),alias:"constant"},variable:s.variable,function:{pattern:/(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,lookbehind:!0},keyword:{pattern:/(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,lookbehind:!0},builtin:{pattern:/(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,lookbehind:!0,alias:"class-name"},boolean:{pattern:/(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,lookbehind:!0},"file-descriptor":{pattern:/\B&\d\b/,alias:"important"},operator:{pattern:/\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,inside:{"file-descriptor":{pattern:/^\d/,alias:"important"}}},punctuation:/\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,number:{pattern:/(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,lookbehind:!0}},i.inside=t.languages.bash;for(var e=["comment","function-name","for-or-select","assign-left","parameter","string","environment","function","keyword","builtin","boolean","file-descriptor","operator","punctuation","number"],o=s.variable[1].inside,a=0;a<e.length;a++)o[e[a]]=t.languages.bash[e[a]];t.languages.sh=t.languages.bash,t.languages.shell=t.languages.bash})(Prism);const E={data(){return{lang:"python",examples:{python:{deps:"pip install numpy open3d",depNote:"open3d is used for mesh visualization. Any library that accepts vertex/index arrays will work.",code:`
import florasynth_Python as fs
import open3d as o3d
import numpy as np
import json
import os

# PRESET: import json parameter set and load it
json_path = os.path.join(os.path.dirname(__file__), "WhiteOak.json") 
with open(json_path, "r") as f:
    tree_parameters = json.load(f)

# 1. Create a simulation and a tree
sim  = fs.create_simulation()
tree = fs.create_tree(tree_parameters)

fs.set_tree_seed(tree, 42)
fs.set_tree_initial_position(tree, 0.0, 0.0, 0.0)
fs.init_tree(tree)

# 2. Add tree to the simulation and grow it
fs.add_tree_to_simulation(sim, tree)
fs.grow(sim, 75, lambda year: print(f"  Growing... year {year}")) # grow tree for 75 years

print(f"Tree age: {fs.get_age(tree)}")

# 3. Build and retrieve the branch mesh
fs.configure_mesh(tree)
mesh_data = fs.get_mesh(tree, "branches")

if mesh_data is None:
    print("No mesh data — tree may not have grown yet.")
else:
    print(f"Vertices: {mesh_data['positions'].shape[0]}")
    print(f"Triangles: {mesh_data['indices'].shape[0] // 3}")

    # 4. Visualize with Open3D
    mesh = o3d.geometry.TriangleMesh()
    mesh.vertices       = o3d.utility.Vector3dVector(mesh_data["positions"])
    mesh.vertex_normals = o3d.utility.Vector3dVector(mesh_data["normals"])
    mesh.triangles      = o3d.utility.Vector3iVector(
        mesh_data["indices"].reshape(-1, 3)
    )

    o3d.visualization.draw_geometries(
        [mesh],
        window_name="Florasynth — Basic Tree",
        mesh_show_back_face=True,
    )

# 5. Clean up
fs.remove_tree_from_simulation(sim, tree)  # also frees the tree`},js:{deps:`npm init -y
npm install <local path to florasynth.tgz file>
npm install three`,depNote:"Three.js is used for rendering. The example sets up a minimal scene with orbit controls. You must serve the project from a local HTTP server (e.g. npx serve .) for ES module imports to work — opening index.html directly as a file:// URL will not work.",code:`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Florasynth Tree</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #1a1a2e; }
    </style>
</head>
<body>
    <script type="importmap">
    {
        "imports": {
            "florasynth": "./node_modules/florasynth_javascript/index.js",
            "three": "./node_modules/three/build/three.module.js",
            "three/examples/jsm/controls/OrbitControls.js": "./node_modules/three/examples/jsm/controls/OrbitControls.js"
        }
    }
    <\/script>
    <script type="module">
        import * as fs from "florasynth";
        import * as THREE from "three";
        import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);

        const controls = new OrbitControls(camera, renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        const sim = fs.simulation_create();
        const tree = fs.create({}); // uses the white oak preset by default, replace with any json parameter set if desired
        fs.set_seed(tree, 42);
        fs.set_starting_position(tree, 0.0, 0.0, 0.0);
        fs.init(tree);
        fs.simulation_add_tree(sim, tree);

        await fs.simulation_grow(sim, 75, (year) => console.log("Year", year));
        await fs.configure_mesh(tree);

        const meshData = fs.get_mesh(tree, "branches");
        if (meshData) {
            const buf = new THREE.InterleavedBuffer(meshData.vertexData, 8);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.InterleavedBufferAttribute(buf, 3, 0));
            geo.setAttribute("normal", new THREE.InterleavedBufferAttribute(buf, 3, 3));
            geo.setAttribute("uv", new THREE.InterleavedBufferAttribute(buf, 2, 6));
            geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B6914, side: THREE.DoubleSide });
            scene.add(new THREE.Mesh(geo, mat));
        }

        (function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        })();
    <\/script>
</body>
</html>
                    `}}}},methods:{hl(t,n){const s={python:"python",js:"javascript",cpp:"cpp"}[n],e=l.languages[s];return e?l.highlight(t,e,s):t},hlBash(t){return l.highlight(t,l.languages.bash,"bash")},langLabel(t){return{python:"Python",js:"JavaScript"}[t]},langTitle(t){return{python:"Python — Open3D Visualization",js:"JavaScript — Three.js Scene"}[t]}}},S={class:"docs_container"},b={class:"lang_tabs"},T=["onClick"],w={class:"example_header"},y={class:"fn_code"},A=["innerHTML"],R={class:"paragraph"},I={class:"fn_code"},O=["innerHTML"],v={key:0,class:"callout callout_info"};function k(t,n,i,s,e,o){return m(),d("div",S,[n[1]||(n[1]=r("h2",{class:"title"},"Basic Tree",-1)),n[2]||(n[2]=r("p",{class:"paragraph"}," This example walks through the full tree lifecycle: create, grow, mesh, and render. Select your language binding below. ",-1)),r("div",b,[(m(),d(h,null,f(["python","js","cpp"],a=>r("button",{key:a,class:g(["lang_tab_btn",{active:e.lang===a}]),onClick:N=>e.lang=a},p(o.langLabel(a)),11,T)),64))]),r("div",w,p(o.langTitle(e.lang)),1),n[3]||(n[3]=r("h3",{class:"heading"},"1. Install Dependencies",-1)),r("pre",y,[r("code",{innerHTML:o.hlBash(e.examples[e.lang].deps)},null,8,A)]),r("p",R,p(e.examples[e.lang].depNote),1),n[4]||(n[4]=r("h3",{class:"heading"},"2. Full Example",-1)),r("pre",I,[r("code",{innerHTML:o.hl(e.examples[e.lang].code,e.lang)},null,8,O)]),e.lang==="js"?(m(),d("div",v,n[0]||(n[0]=[r("strong",null,"Top-level await",-1),c(" This example uses top-level "),r("code",null,"await",-1),c(", which requires an ES module context ("),r("code",null,'type="module"',-1),c(" in your script tag, or a bundler like Vite). ")]))):_("",!0)])}const C=u(E,[["render",k],["__scopeId","data-v-c5ae9f42"]]);export{C as default};
