clean:
	rm -rf node_modules
install:
	pnpm i
reinstall:
	make clean
	make install
	cd website
	make reinstall
	cd ..
