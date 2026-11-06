/**
 * Tools that ship with JARVIS, so a fresh clone can do more than talk.
 *
 * The bridge hands the SDK every MCP server in ~/.claude.json, and on a new
 * machine that file is empty. These fill the gap. They are merged in *under*
 * the user's own servers, so an entry of the same name in ~/.claude.json always
 * wins, and JARVIS_BUNDLED_TOOLS=0 turns the whole set off.
 *
 * Every version is pinned. `npx` re-resolves an unpinned package on every
 * start, which makes it live code we never reviewed, running with whatever
 * permissions JARVIS has.
 *
 * Web search and page reading need nothing here: Claude Code's own WebSearch
 * and WebFetch run on the same login as the brain.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const JARVIS_HOME = join(homedir(), '.jarvis')

const npx = (pkg, args = [], env = {}) => ({
  type: 'stdio',
  command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
  args: ['-y', pkg, ...args],
  env,
})

export function bundledServers(env = process.env) {
  if (env.JARVIS_BUNDLED_TOOLS === '0') return {}

  try {
    mkdirSync(JARVIS_HOME, { recursive: true })
  } catch {
    /* memory will report its own error if it cannot write */
  }

  const servers = {
    // A long-term memory: people, preferences, projects, kept as a small graph
    // in ~/.jarvis/memory.json so it survives restarts.
    memory: npx('@modelcontextprotocol/server-memory@2.1.0', [], {
      MEMORY_FILE_PATH: join(JARVIS_HOME, 'memory.json'),
    }),
    // A browser of JARVIS's own, for when the Claude extension in the user's
    // Chrome is not reachable. The persona is told to prefer their real Chrome.
    playwright: npx('@playwright/mcp@0.0.84', [
      '--user-data-dir', join(JARVIS_HOME, 'browser-profile'),
    ]),
  }

  // Better search than the built-in one, but it needs a key, so it only joins
  // when one is set. Free tier at exa.ai.
  if (env.EXA_API_KEY) {
    servers.exa = npx('exa-mcp-server@3.4.3', [], { EXA_API_KEY: env.EXA_API_KEY })
  }

  return servers
}
