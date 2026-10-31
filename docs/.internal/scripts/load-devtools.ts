import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelCreateConfig,
  ViewModelSimple,
} from 'mobx-view-model';

export async function loadDevtools() {
  const [
    { ViewModelStoreBase, ViewModelBase },
    { ViewModelDevtools },
    { action, computed, makeAutoObservable, makeObservable, observable },
  ] = await Promise.all([
    import('mobx-view-model'),
    import('mobx-view-model-devtools'),
    import('mobx'),
  ]);

  const store = new ViewModelStoreBase({
    vmConfig: {
      observable: {
        viewModels: { useDecorators: false },
        viewModelStores: { useDecorators: false },
      },
    },
  });

  class DocsDemoHomeVM implements ViewModelSimple {
    id = 'docs-demo-home';
    pageTitle = 'mobx-view-model docs';
    tagline = 'MVVM with MobX and React';
    lastVisitedAt = new Date('2026-05-26T12:00:00Z');
    featuredSections = ['introduction', 'api', 'recipes', 'react'];
    visitorCount = 1284;
    theme: 'light' | 'dark' = 'light';

    constructor() {
      makeAutoObservable(this);
    }

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    }
  }

  class DocsDemoCounterVM implements ViewModelSimple {
    id = 'docs-demo-counter';
    label = 'Documentation views';
    count = 42;
    maxCount = 999;
    step = 1;
    history: number[] = [40, 41, 42];

    constructor() {
      makeAutoObservable(this);
    }

    get isAtMax() {
      return this.count >= this.maxCount;
    }

    increment() {
      this.history.push(this.count);
      this.count = Math.min(this.count + this.step, this.maxCount);
    }

    reset() {
      this.history = [];
      this.count = 0;
    }
  }

  class DocsDemoNavVM extends ViewModelBase<{
    sections: { id: string; label: string; path: string }[];
    collapsed: boolean;
  }> {
    activePath = '/introduction/overview';
    expandedSectionIds: string[] = ['introduction', 'api'];
    visitCount = 17;

    constructor() {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-nav',
        payload: {
          sections: [
            { id: 'introduction', label: 'Introduction', path: '/introduction/overview' },
            { id: 'api', label: 'Core API', path: '/api/view-models/overview' },
            { id: 'react', label: 'React', path: '/react/integration' },
            { id: 'solid', label: 'Solid', path: '/solid/integration' },
            { id: 'recipes', label: 'Recipes', path: '/recipes/all-props-as-payload' },
            { id: 'other', label: 'Other', path: '/other/dev-tools' },
          ],
          collapsed: false,
        },
        ctx: { layout: 'sidebar', version: '10.2.0' },
        props: { showIcons: true, sticky: true },
      });
      makeObservable(this, {
        activePath: observable,
        expandedSectionIds: observable,
        visitCount: observable,
        activeSectionLabel: computed,
        setActivePath: action.bound,
        toggleSection: action.bound,
      });
    }

    get activeSectionLabel() {
      const section = this.payload.sections.find((s) => s.path === this.activePath);
      return section?.label ?? 'Unknown';
    }

    setActivePath(path: string) {
      this.activePath = path;
      this.visitCount += 1;
    }

    toggleSection(sectionId: string) {
      if (this.expandedSectionIds.includes(sectionId)) {
        this.expandedSectionIds = this.expandedSectionIds.filter((id) => id !== sectionId);
      } else {
        this.expandedSectionIds.push(sectionId);
      }
    }
  }

  class DocsDemoSearchVM extends ViewModelBase<{
    query: string;
    scope: 'all' | 'api' | 'react' | 'recipes';
    resultsCount: number;
    recentQueries: string[];
  }> {
    isSearching = false;
    selectedResultIndex = 0;

    constructor() {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-search',
        payload: {
          query: 'ViewModelStore',
          scope: 'api',
          resultsCount: 12,
          recentQueries: ['withViewModel', 'ViewModelBase', 'SSR'],
        },
        ctx: { debounceMs: 300, minQueryLength: 2 },
        props: { placeholder: 'Search documentation…', autofocus: false },
      });
      makeObservable(this, {
        isSearching: observable,
        selectedResultIndex: observable,
        hasQuery: computed,
        setQuery: action.bound,
        setScope: action.bound,
      });
    }

    get hasQuery() {
      return this.payload.query.trim().length > 0;
    }

    setQuery(query: string) {
      this.isSearching = true;
      this.setPayload({
        ...this.payload,
        query,
        resultsCount: query.length > 0 ? Math.min(query.length * 3, 48) : 0,
        recentQueries: query
          ? [query, ...this.payload.recentQueries.filter((q) => q !== query)].slice(0, 5)
          : this.payload.recentQueries,
      });
      this.isSearching = false;
    }

    setScope(scope: DocsDemoSearchVM['payload']['scope']) {
      this.setPayload({ ...this.payload, scope });
    }
  }

  class DocsDemoRecipeVM extends ViewModelBase<{
    recipeId: string;
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedMinutes: number;
  }> {
    stepsDone = 0;
    notes = 'Connect RootStore via ViewModelParams.viewModels';
    startedAt = new Date('2026-05-26T10:30:00Z');

    constructor() {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-recipe',
        payload: {
          recipeId: 'integration-with-root-store',
          title: 'Integration with Root Store',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        ctx: { category: 'architecture', tags: ['store', 'react', 'ssr'] },
        props: { showProgress: true },
      });
      makeObservable(this, {
        stepsDone: observable,
        notes: observable,
        progressPercent: computed,
        completeStep: action.bound,
        appendNote: action.bound,
      });
    }

    get progressPercent() {
      return Math.round((this.stepsDone / 4) * 100);
    }

    completeStep() {
      this.stepsDone = Math.min(this.stepsDone + 1, 4);
    }

    appendNote(line: string) {
      this.notes = `${this.notes}\n${line}`;
    }
  }

  class DocsDemoNavBreadcrumbVM extends ViewModelBase<
    { label: string; href: string; depth: number },
    DocsDemoNavVM
  > {
    isCurrent = true;

    constructor(parent: DocsDemoNavVM) {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-nav-breadcrumb',
        payload: {
          label: 'Introduction',
          href: '/introduction/overview',
          depth: 1,
        },
        parentViewModel: parent,
        ctx: { separator: '/' },
      });
      makeObservable(this, { isCurrent: observable });
    }
  }

  class DocsDemoApiSectionVM extends ViewModelBase<
    { topic: string; pageCount: number; lastUpdated: string },
    DocsDemoNavVM
  > {
    expanded = true;
    bookmarkedPages: string[] = ['interface', 'base-implementation'];

    constructor(parent: DocsDemoNavVM) {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-api-section',
        payload: {
          topic: 'view-models',
          pageCount: 6,
          lastUpdated: '2026-05-20',
        },
        parentViewModel: parent,
        ctx: { sidebarGroup: 'Core API' },
        props: { defaultOpen: true },
      });
      makeObservable(this, {
        expanded: observable,
        bookmarkedPages: observable,
        setTopic: action.bound,
        toggleExpanded: action.bound,
      });
    }

    setTopic(topic: string) {
      this.setPayload({ ...this.payload, topic });
    }

    toggleExpanded() {
      this.expanded = !this.expanded;
    }
  }

  class DocsDemoApiTopicDetailVM extends ViewModelBase<
    {
      detail: string;
      symbolName: string;
      deprecated: boolean;
      relatedLinks: string[];
    },
    DocsDemoApiSectionVM
  > {
    scrollOffset = 0;
    codeSampleVisible = true;

    constructor(parent: DocsDemoApiSectionVM) {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-api-topic-detail',
        payload: {
          detail: 'interface',
          symbolName: 'ViewModel',
          deprecated: false,
          relatedLinks: [
            '/api/view-models/base-implementation',
            '/api/view-models/view-model-simple',
          ],
        },
        parentViewModel: parent,
        ctx: { language: 'typescript' },
        props: { showTableOfContents: true },
      });
      makeObservable(this, {
        scrollOffset: observable,
        codeSampleVisible: observable,
        displayTitle: computed,
      });
    }

    get displayTitle() {
      return `${this.payload.symbolName} (${this.payload.detail})`;
    }
  }

  class DocsDemoSearchFilterVM extends ViewModelBase<
    {
      filter: string;
      matchCount: number;
      onlyExact: boolean;
    },
    DocsDemoSearchVM
  > {
    constructor(parent: DocsDemoSearchVM) {
      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: 'docs-demo-search-filter',
        payload: {
          filter: 'api',
          matchCount: 8,
          onlyExact: false,
        },
        parentViewModel: parent,
        ctx: { facet: 'category' },
        props: { multiSelect: true },
      });
      makeObservable(this, {
        setFilter: action.bound,
        toggleExact: action.bound,
      });
    }

    setFilter(filter: string) {
      this.setPayload({
        ...this.payload,
        filter,
        matchCount: filter.length * 2,
      });
    }

    toggleExact() {
      this.setPayload({ ...this.payload, onlyExact: !this.payload.onlyExact });
    }
  }

  class DocsDemoRecipeStepVM extends ViewModelBase<
    {
      stepIndex: number;
      title: string;
      completed: boolean;
      checklist: string[];
    },
    DocsDemoRecipeVM
  > {
    constructor(parent: DocsDemoRecipeVM, stepIndex: number) {
      const steps = [
        {
          title: 'Create RootStore',
          checklist: ['Define stores map', 'Expose viewModelStore'],
        },
        {
          title: 'Pass viewModels to ViewModelBase',
          checklist: ['Extend ViewModelBase', 'Use this.viewModels.get()'],
        },
        {
          title: 'Wrap app with ViewModelsProvider',
          checklist: ['Create store instance', 'Add provider at root'],
        },
        {
          title: 'Verify in DevTools',
          checklist: ['Connect store', 'Inspect parent/child VMs'],
        },
      ] as const;
      const step = steps[stepIndex - 1] ?? steps[0];

      super({
        viewModels: store,
        vmConfig: store.vmConfig,
        id: `docs-demo-recipe-step-${stepIndex}`,
        payload: {
          stepIndex,
          title: step.title,
          completed: stepIndex <= parent.stepsDone,
          checklist: [...step.checklist],
        },
        parentViewModel: parent,
        ctx: { stepIndex },
      });
      makeObservable(this, {
        markCompleted: action.bound,
        toggleChecklistItem: action.bound,
      });
    }

    markCompleted() {
      this.setPayload({ ...this.payload, completed: true });
    }

    toggleChecklistItem(index: number) {
      const checklist = this.payload.checklist.map((item, i) =>
        i === index ? (item.startsWith('✓ ') ? item.slice(2) : `✓ ${item}`) : item,
      );
      this.setPayload({ ...this.payload, checklist });
    }
  }

  // Keep demo class names readable in the minified documentation bundle.
  for (const [name, VM] of Object.entries({
    DocsDemoHomeVM,
    DocsDemoCounterVM,
    DocsDemoNavVM,
    DocsDemoSearchVM,
    DocsDemoRecipeVM,
    DocsDemoNavBreadcrumbVM,
    DocsDemoApiSectionVM,
    DocsDemoApiTopicDetailVM,
    DocsDemoSearchFilterVM,
    DocsDemoRecipeStepVM,
  })) {
    Object.defineProperty(VM, 'name', { value: name });
  }

  // Core 11 registers existing instances through connect(instance, config).
  const register = <T extends AnyViewModel | AnyViewModelSimple>(instance: T) => {
    store.connect(instance, {
      VM: instance.constructor as ViewModelCreateConfig<T>['VM'],
      id: instance.id!,
      payload: instance instanceof ViewModelBase ? instance.payload : {},
    });
    return instance;
  };

  const navVM = new DocsDemoNavVM();
  register(navVM);
  register(new DocsDemoNavBreadcrumbVM(navVM));

  const apiSectionVM = new DocsDemoApiSectionVM(navVM);
  register(apiSectionVM);
  register(new DocsDemoApiTopicDetailVM(apiSectionVM));

  const searchVM = new DocsDemoSearchVM();
  register(searchVM);
  register(new DocsDemoSearchFilterVM(searchVM));

  const recipeVM = new DocsDemoRecipeVM();
  register(recipeVM);
  register(new DocsDemoRecipeStepVM(recipeVM, 1));
  register(new DocsDemoRecipeStepVM(recipeVM, 2));
  register(new DocsDemoRecipeStepVM(recipeVM, 3));
  register(new DocsDemoRecipeStepVM(recipeVM, 4));

  register(new DocsDemoHomeVM());
  register(new DocsDemoCounterVM());

  const devtools = ViewModelDevtools.connect(store);
  ViewModelDevtools.connectExtras({
    source: 'mobx-view-model-docs',
    environment: 'docs',
    viewModels: store,
    globalThis,
    demoTree: {
      nav: ['breadcrumb', 'apiSection → topicDetail'],
      search: ['filter'],
      recipe: ['step-1', 'step-2', 'step-3', 'step-4'],
      simple: ['home', 'counter'],
    },
  });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      devtools.destroy();
      store.clean();
    });
  }
}
