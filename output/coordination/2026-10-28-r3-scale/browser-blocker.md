# Browser evidence blocker

Attempt: `node output/coordination/2026-10-28-r3-scale/capture.mjs before`, using the installed Playwright package and Chromium headless shell 1243.

Chromium terminated before creating a page:

```
FATAL:base/apple/mach_port_rendezvous_mac.cc:159
Check failed: kr == KERN_SUCCESS.
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.10515:
Permission denied (1100)
```

The in-app browser fallback returned `The browser access host is unavailable`.

No screenshots or browser console results were collected. Empty console output must not be interpreted as a clean console. This sandbox does not allow escalation; no sandbox or system settings were changed.

The capture script is supplied for a browser-enabled runner, not claimed as validated end to end. It expects a local server on port 8873 and an installed Playwright module (`PLAYWRIGHT_MODULE` may point to its `index.mjs`). `before` reads source files from the original run HEAD through read-only `git show`; `after` reads the working directory. It uses the production UI and map renderer with an isolated test party. Fixture positions are held constant, with deviceScaleFactor=1 and reduced motion. Map capture is a fixed overview, not a walking playtest.
