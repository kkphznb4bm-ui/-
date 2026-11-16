import { Config } from '@remotion/cli/config';

// Use the Chromium headless shell preinstalled on this machine instead of downloading one.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
