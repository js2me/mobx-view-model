.PHONY: clean
clean:
	rm -rf node_modules && \
	rm -rf ./examples/**/node_modules && \
	rm -rf ./packages/**/node_modules && \
	rm -rf ./examples/**/dist && \
	rm -rf ./packages/**/dist && \
	rm -rf ./docs/.vitepress/dist && \
	rm -rf ./docs/.vitepress/cache && \
	rm -rf ./docs/node_modules

.PHONY: install
install:
	pnpm i

.PHONY: reinstall
reinstall: clean install

.PHONY: doc
doc:
	cd docs && \
	rm -rf node_modules && \
	rm -rf .vitepress/cache && \
	pnpm i && \
	pnpm dev

.PHONY: doc-build
doc-build:
	cd docs && \
	rm -rf node_modules && \
	rm -rf .vitepress/cache && \
	pnpm i && \
	pnpm build

.PHONY: ssr-example
ssr-example:
	pnpm example:ssr

.PHONY: ssr-nextjs-example
ssr-nextjs-example: reinstall
	pnpm --dir examples/ssr-nextjs dev

.PHONY: ssr-expressjs-example
ssr-expressjs-example: reinstall
	pnpm --dir examples/ssr-expressjs dev

.PHONY: csr-react18-example
csr-react18-example: reinstall
	pnpm --dir examples/csr-react18 dev

.PHONY: csr-react19-example
csr-react19-example: reinstall
	pnpm --dir examples/csr-react19 dev

.PHONY: build
build: reinstall
	pnpm build

.PHONY: check
check: reinstall
	pnpm check

.PHONY: gh-actions-test
gh-actions-test: reinstall
	pnpm check && \
	pnpm build && \
	pnpm test:type-regression && \
	pnpm examples:build && \
	pnpm docs:build && \
	pnpm test:coverage && \
	pnpm test:examples