const STORAGE_KEY = 'project-tracker-v1';
const STATUS_ORDER = ['todo', 'inprogress', 'review', 'done'];
const STATUS_META = {
  todo: { label: 'To Do', color: 'var(--todo)' },
  inprogress: { label: 'In Progress', color: 'var(--inprogress)' },
  review: { label: 'Review', color: 'var(--review)' },
  done: { label: 'Done', color: 'var(--done)' },
};

const defaultProjects = [
  { id: 'proj-website', name: 'Website Redesign', owner: 'Marketing', color: '#6d5efc' },
  { id: 'proj-mobile', name: 'Mobile App', owner: 'Product Team', color: '#22c55e' },
  { id: 'proj-brand', name: 'Brand Campaign', owner: 'Growth', color: '#f59e0b' },
];

const defaultTasks = [
  {
    id: 'task-1',
    projectId: 'proj-website',
    title: 'Homepage wireframe',
    description: 'Create the new homepage layout and align with marketing goals.',
    priority: 'High',
    assignee: 'Aoi',
    dueDate: dateOffset(3),
    status: 'todo',
  },
  {
    id: 'task-2',
    projectId: 'proj-website',
    title: 'CTA revision',
    description: 'Update button copy and style for better conversion flow.',
    priority: 'Medium',
    assignee: 'Nina',
    dueDate: dateOffset(6),
    status: 'inprogress',
  },
  {
    id: 'task-3',
    projectId: 'proj-mobile',
    title: 'Sprint planning',
    description: 'Finalize next sprint priorities and story breakdown.',
    priority: 'Low',
    assignee: 'Kenta',
    dueDate: dateOffset(1),
    status: 'review',
  },
  {
    id: 'task-4',
    projectId: 'proj-brand',
    title: 'Campaign assets',
    description: 'Collect final social visual versions and approvals.',
    priority: 'High',
    assignee: 'Ploy',
    dueDate: dateOffset(2),
    status: 'done',
  },
];

const state = loadState();

const els = {
  summaryCards: document.getElementById('summaryCards'),
  projectList: document.getElementById('projectList'),
  taskForm: document.getElementById('taskForm'),
  taskProjectSelect: document.getElementById('taskProjectSelect'),
  projectForm: document.getElementById('projectForm'),
  projectModal: document.getElementById('projectModal'),
  board: document.getElementById('board'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  currentProjectName: document.getElementById('currentProjectName'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
};

function dateOffset(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().split('T')[0];
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      selectedProjectId: defaultProjects[0].id,
      projects: defaultProjects,
      tasks: defaultTasks,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      selectedProjectId: parsed.selectedProjectId || defaultProjects[0].id,
      projects: parsed.projects?.length ? parsed.projects : defaultProjects,
      tasks: parsed.tasks?.length ? parsed.tasks : defaultTasks,
    };
  } catch (error) {
    return {
      selectedProjectId: defaultProjects[0].id,
      projects: defaultProjects,
      tasks: defaultTasks,
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureSelectedProject() {
  if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0]?.id || null;
  }
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}-${Date.now().toString(36)}`;
}

function getProjectById(projectId) {
  return state.projects.find((project) => project.id === projectId);
}

function getTasksForProject(projectId) {
  return state.tasks.filter((task) => task.projectId === projectId);
}

function renderSummary() {
  const totalProjects = state.projects.length;
  const totalTasks = state.tasks.length;
  const activeTasks = state.tasks.filter((task) => task.status !== 'done').length;
  const doneTasks = state.tasks.filter((task) => task.status === 'done').length;
  const urgentTasks = state.tasks.filter((task) => task.priority === 'High' && task.status !== 'done').length;

  const cards = [
    { label: 'Projects', value: totalProjects, trend: 'Live' },
    { label: 'Tasks', value: totalTasks, trend: 'All' },
    { label: 'Active', value: activeTasks, trend: 'In motion' },
    { label: 'Urgent', value: urgentTasks, trend: 'High priority' },
  ];

  els.summaryCards.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <div class="label">${card.label}</div>
          <div class="value">
            <strong>${card.value}</strong>
            <span class="trend">${card.trend}</span>
          </div>
        </article>
      `,
    )
    .join('');
}

function renderProjectList() {
  els.projectList.innerHTML = state.projects
    .map((project) => {
      const taskCount = getTasksForProject(project.id).length;
      const active = project.id === state.selectedProjectId ? 'active' : '';

      return `
        <div class="project-item">
          <button class="project-select ${active}" data-action="select-project" data-project-id="${project.id}">
            <span class="project-meta">
              <span class="color-dot" style="background:${project.color}"></span>
              <span>${project.name}</span>
            </span>
            <span class="project-count">${taskCount}</span>
          </button>
          <button class="icon-btn" data-action="delete-project" data-project-id="${project.id}" aria-label="Delete project">✕</button>
        </div>
      `;
    })
    .join('');

  const projectOptions = state.projects
    .map(
      (project) =>
        `<option value="${project.id}" ${project.id === state.selectedProjectId ? 'selected' : ''}>${project.name}</option>`,
    )
    .join('');

  els.taskProjectSelect.innerHTML = projectOptions;
  els.taskProjectSelect.value = state.selectedProjectId;

  const project = getProjectById(state.selectedProjectId);
  els.currentProjectName.textContent = project ? project.name : 'All tasks';
}

function renderBoard() {
  const query = els.searchInput.value.trim().toLowerCase();
  const statusFilter = els.statusFilter.value;
  const selectedProject = getProjectById(state.selectedProjectId);

  if (!selectedProject) {
    els.board.innerHTML = '<div class="empty-state">No project selected.</div>';
    return;
  }

  const filteredTasks = getTasksForProject(selectedProject.id).filter((task) => {
    const matchesQuery =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.assignee.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const columns = STATUS_ORDER.map((statusKey) => {
    const tasks = filteredTasks.filter((task) => task.status === statusKey);

    return `
      <div class="board-column">
        <div class="column-header">
          <span>${STATUS_META[statusKey].label}</span>
          <span class="count">${tasks.length}</span>
        </div>
        <div class="task-list">
          ${
            tasks.length
              ? tasks
                  .map(
                    (task) => `
                      <article class="task-card">
                        <div class="task-card-header">
                          <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        </div>
                        <h3>${task.title}</h3>
                        <p>${task.description || 'No description provided.'}</p>
                        <div class="task-meta">
                          <span class="meta-pill">👤 ${task.assignee || 'Unassigned'}</span>
                          <span class="meta-pill">📅 ${task.dueDate ? formatDate(task.dueDate) : 'No date'}</span>
                        </div>
                        <div class="task-actions">
                          <button class="board-action" data-action="move-task" data-direction="-1" data-task-id="${task.id}">←</button>
                          <button class="board-action" data-action="move-task" data-direction="1" data-task-id="${task.id}">→</button>
                          <button class="board-action danger" data-action="delete-task" data-task-id="${task.id}">Delete</button>
                        </div>
                      </article>
                    `,
                  )
                  .join('')
              : '<div class="empty-state">No tasks here.</div>'
          }
        </div>
      </div>
    `;
  });

  els.board.innerHTML = columns.join('');
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function updateSelectedProject(projectId) {
  state.selectedProjectId = projectId;
  saveState();
  render();
}

function createProject(name, owner, color) {
  const project = {
    id: makeId('project'),
    name,
    owner,
    color,
  };

  state.projects.push(project);
  state.selectedProjectId = project.id;
  saveState();
  render();
}

function deleteProject(projectId) {
  if (state.projects.length === 1) {
    alert('You need at least one project in the tracker.');
    return;
  }

  const confirmDelete = window.confirm('Delete this project and all of its tasks?');
  if (!confirmDelete) return;

  state.projects = state.projects.filter((project) => project.id !== projectId);
  state.tasks = state.tasks.filter((task) => task.projectId !== projectId);

  if (state.selectedProjectId === projectId) {
    state.selectedProjectId = state.projects[0].id;
  }

  saveState();
  render();
}

function createTask(formData) {
  const task = {
    id: makeId('task'),
    projectId: formData.get('projectId'),
    title: String(formData.get('title')).trim(),
    description: String(formData.get('description')).trim(),
    priority: String(formData.get('priority') || 'Medium'),
    assignee: String(formData.get('assignee') || 'Unassigned').trim() || 'Unassigned',
    dueDate: formData.get('dueDate') || '',
    status: 'todo',
  };

  if (!task.title) return;

  state.tasks.unshift(task);
  saveState();
  render();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveState();
  render();
}

function moveTask(taskId, direction) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const index = STATUS_ORDER.indexOf(task.status);
  const nextIndex = Math.min(Math.max(index + direction, 0), STATUS_ORDER.length - 1);
  task.status = STATUS_ORDER[nextIndex];
  saveState();
  render();
}

function render() {
  ensureSelectedProject();
  renderSummary();
  renderProjectList();
  renderBoard();
}

els.newProjectBtn.addEventListener('click', () => {
  els.projectModal.classList.remove('hidden');
});

els.closeModalBtn.addEventListener('click', () => {
  els.projectModal.classList.add('hidden');
});

els.projectModal.addEventListener('click', (event) => {
  if (event.target === els.projectModal) {
    els.projectModal.classList.add('hidden');
  }
});

els.projectForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(els.projectForm);
  const name = String(formData.get('name') || '').trim();
  const owner = String(formData.get('owner') || '').trim();
  const color = String(formData.get('color') || '#6d5efc');

  if (!name) return;

  createProject(name, owner, color);
  els.projectForm.reset();
  els.projectModal.classList.add('hidden');
});

els.taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(els.taskForm);
  createTask(formData);
  els.taskForm.reset();
  els.taskProjectSelect.value = state.selectedProjectId;
});

els.taskProjectSelect.addEventListener('change', (event) => {
  state.selectedProjectId = event.target.value;
  saveState();
  render();
});

els.searchInput.addEventListener('input', renderBoard);
els.statusFilter.addEventListener('change', renderBoard);

document.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  const { action, projectId, taskId, direction } = actionTarget.dataset;

  if (action === 'select-project' && projectId) {
    updateSelectedProject(projectId);
    return;
  }

  if (action === 'delete-project' && projectId) {
    deleteProject(projectId);
    return;
  }

  if (action === 'delete-task' && taskId) {
    deleteTask(taskId);
    return;
  }

  if (action === 'move-task' && taskId) {
    moveTask(taskId, Number(direction || 0));
  }
});

render();
