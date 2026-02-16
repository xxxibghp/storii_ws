const API = "";

let openTabs = {}; 
let tabOrder = [];
let currentFile = null;
let isProgrammaticChange = false;
let autoSaveEnabled = false;
let autoSaveTimer = null;

document.getElementById("autoSaveToggle")
  .addEventListener("change", (e) => {
    autoSaveEnabled = e.target.checked;
  });

function getFileIcon(filename) {
    const ext = filename.includes(".")
        ? filename.split(".").pop().toLowerCase()
        : "";

  const iconMap = {
    html: "devicon-html5-plain colored",
    css: "devicon-css3-plain colored",
    js: "devicon-javascript-plain colored",
    ts: "devicon-typescript-plain colored",
    py: "devicon-python-plain colored",
    java: "devicon-java-plain colored",
    cpp: "devicon-cplusplus-plain colored",
    c: "devicon-c-plain colored",
    json: "devicon-json-plain colored",
    md: "devicon-markdown-original",
    node: "devicon-nodejs-plain colored",
    react: "devicon-react-original colored",
    vue: "devicon-vuejs-plain colored",
    php: "devicon-php-plain colored",
    go: "devicon-go-plain colored",
    rb: "devicon-ruby-plain colored",
    sh: "devicon-bash-plain colored"
  };

  return iconMap[ext] || "devicon-readthedocs-original";
}

async function loadFiles() {
  const res = await fetch(`${API}/files`);
  const data = await res.json();

  const container = document.getElementById("fileTree");
  container.innerHTML = "";
  renderTree(data, container);
}

function renderTree(nodes, container) {
  const ul = document.createElement("ul");

  nodes.forEach(node => {
    const li = document.createElement("li");

    if (node.type === "folder") {
      li.classList.add("folder-node");

      const folderHeader = document.createElement("div");
      folderHeader.className = "folder-header";

      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.innerHTML = "▸";

      const name = document.createElement("span");
      name.className = "folder-name";
      name.innerText = "📁 " + node.name;

      folderHeader.appendChild(arrow);
      folderHeader.appendChild(name);

      const childContainer = document.createElement("div");
      childContainer.className = "folder-children";

      folderHeader.onclick = () => {
        childContainer.classList.toggle("open");
        arrow.classList.toggle("rotate");
      };

      renderTree(node.children, childContainer);

      li.appendChild(folderHeader);
      li.appendChild(childContainer);
    } else {
      const span = document.createElement("span");
      span.className = "file";

      const icon = document.createElement("i");
      icon.className = getFileIcon(node.name);

      const text = document.createElement("span");
      text.innerText = " " + node.name;

      span.appendChild(icon);
      span.appendChild(text);

      span.onclick = () => {
        currentFilePath = node.path;

        document.querySelectorAll(".file").forEach(el =>
          el.classList.remove("active")
        );

        span.classList.add("active");
        openFile(node.path);
      };

      li.appendChild(span);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

const editor = CodeMirror.fromTextArea(
  document.getElementById("editor"),
  {
    mode: {
      name: "markdown",
      highlightFormatting: true
    },
    theme: "tomorrow-night-bright",
    lineNumbers: true,
    lineWrapping: true
  }
);

const prompt = CodeMirror.fromTextArea(
  document.getElementById("prompt"),
  {
    mode: {
      name: "markdown",
      highlightFormatting: true
    },
    theme: "tomorrow-night-bright",
    lineNumbers: true,
    lineWrapping: true
  }
);

const airesp = CodeMirror.fromTextArea(
  document.getElementById("airesp"),
  {
    mode: {
      name: "markdown",
      highlightFormatting: true
    },
    theme: "tomorrow-night-bright",
    lineNumbers: true,
    lineWrapping: true
  }
);

async function openFile(path) {
  if (!openTabs[path]) {
    const res = await fetch(`${API}/file?path=${path}`);
    const data = await res.json();

    openTabs[path] = {
      content: data.content,
      originalContent: data.content,
      isDirty: false
    };
    
    tabOrder.push(path);
  }

  switchTab(path);
  renderTabs();
}

function switchTab(path) {
  currentFile = path;

  isProgrammaticChange = true;
  editor.setValue(openTabs[path].content);
  isProgrammaticChange = false;

  renderTabs();
}

function renderTabs() {
  const container = document.getElementById("tabs");
  container.innerHTML = "";

  tabOrder.forEach(path => {
    const tab = document.createElement("div");
    tab.className = "tab" + (path === currentFile ? " active" : "");

    tab.draggable = true;

// khi bắt đầu drag
tab.addEventListener("dragstart", (e) => {
  e.dataTransfer.setData("text/plain", path);
});

// cho phép drop
tab.addEventListener("dragover", (e) => {
  e.preventDefault();
});

// khi drop
tab.addEventListener("drop", (e) => {
  e.preventDefault();

  const draggedPath = e.dataTransfer.getData("text/plain");

  const fromIndex = tabOrder.indexOf(draggedPath);
  const toIndex = tabOrder.indexOf(path);

  if (fromIndex === -1 || toIndex === -1) return;

  tabOrder.splice(fromIndex, 1);
  tabOrder.splice(toIndex, 0, draggedPath);

  renderTabs();
});

    const name = path.split("/").pop();
    const dirtyMark = openTabs[path].isDirty ? "*" : "";

    tab.innerHTML = `
      <span>${name}${dirtyMark}</span>
      <span class="close">✕</span>
    `;

    tab.onclick = () => switchTab(path);

    tab.querySelector(".close").onclick = (e) => {
      e.stopPropagation();
      delete openTabs[path];
      tabOrder = tabOrder.filter(p => p !== path);
      if (currentFile === path) {
        currentFile = null;
        editor.setValue("");
      }
      renderTabs();
    };

    container.appendChild(tab);
  });
}

editor.on("change", () => {
  if (!currentFile || isProgrammaticChange) return;

  const newValue = editor.getValue();
  openTabs[currentFile].content = newValue;
  openTabs[currentFile].isDirty = newValue !== openTabs[currentFile].originalContent;

  renderTabs();

  // ===== AUTO SAVE LOGIC =====
  if (!autoSaveEnabled || !openTabs[currentFile].isDirty) return;

  // reset timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(async () => {
    await saveCurrentFile();
  }, 3000); // 30s
});

async function saveCurrentFile() {
  if (!currentFile) return;

  const tab = openTabs[currentFile];
  if (!tab.isDirty) return;

  await fetch(`${API}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: currentFile,
      content: tab.content
    })
  });

  tab.originalContent = tab.content;
  tab.isDirty = false;

  renderTabs();
}

document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    if (!currentFile) return;

    await fetch(`${API}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentFile,
        content: openTabs[currentFile].content
      })
    });

    openTabs[currentFile].isDirty = false;
    renderTabs();
    saveCurrentFile();
  }
});

async function saveFile() {
  if (!currentFile) return;

  openTabs[currentFile].originalContent = openTabs[currentFile].content;
  openTabs[currentFile].isDirty = false;

  const content = editor.getValue();

  await fetch(`${API}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: currentFile,
      content: content
    })
  });

  // alert("Saved");
}

async function runAI() {
  const res = await fetch(`${API}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.getValue(), context: editor.getValue() })
  });

  const data = await res.json();

  airesp.setValue(data.result);
}

async function loadRAG() {
  const res = await fetch(`${API}/load_rag`, {
    method: "POST"
  });

  const data = await res.json();

  document.getElementById("ragStatusFooter").innerText = `RAG: Loaded | Chars: ${data.characters} | Tokens: ~${data.estimated_tokens}`;

  let stat = document.getElementById("ragStatusFooter");

  if (data.estimated_tokens > 220000) {
    stat.style.color = "red";
  } else if (data.estimated_tokens > 150000) {
    stat.style.color = "orange";
  } else {
    stat.style.color = "lightgreen";
  }
}

loadFiles();

const editorPanel = document.getElementById("editorPanel");
const resizebar = document.getElementById("resizebar");
const main = document.querySelector(".main");

let isResizing = false;

// Detect mouse near bottom edge (10px zone)
resizebar.addEventListener("mousemove", (e) => {
  const rect = resizebar.getBoundingClientRect();
  if (e.clientY - rect.top < 10) {
    resizebar.style.cursor = "row-resize";
  } else {
    resizebar.style.cursor = "default";
  }
});

resizebar.addEventListener("mousedown", (e) => {
  const rect = resizebar.getBoundingClientRect();
  if (e.clientY - rect.top < 10) {
    isResizing = true;
    document.body.style.cursor = "row-resize";
  }
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;

  const newHeight =
    e.clientY - editorPanel.getBoundingClientRect().top;

  if (newHeight > 200) {
    editorPanel.style.height = newHeight + "px";
    editor.refresh();
  }
});


document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.cursor = "default";
});

function updateEditorStatus() {
  const cursor = editor.getCursor();
  const content = editor.getValue();

  const line = cursor.line + 1;
  const words = content.trim().split(/\s+/).length;

  document.getElementById("editorStatus").innerText =
    `Ln ${line} | Words ${words}`;
}

editor.on("cursorActivity", updateEditorStatus);
editor.on("change", updateEditorStatus);
