#!/usr/bin/env bash

for attempt in 1 2 3 4 5; do
	if pnpm exec changeset version && pnpm install --lockfile-only --no-frozen-lockfile; then
		exit 0
	fi
	echo "changeset version failed (attempt $attempt), retrying in 15s..."
	sleep 15
done

exit 1
