export const AUTODOCS_DIR = '.autodocs'

// map.json — full bidirectional index (symbol+file → docs). Used by init/update.
export const MAP_FILENAME = 'map.json'
export const MAP_RELATIVE_PATH = `${AUTODOCS_DIR}/${MAP_FILENAME}`

// lookup/ — hash-sharded symbol→docs index, one file per shard (00–ff).
// shard(symbol) = sha256(name)[0..1] → 256 buckets, ~|S|/256 entries each.
// check reads only the shards for symbols that changed: O(|Q|) reads vs O(|S|).
export const LOOKUP_DIR = `${AUTODOCS_DIR}/lookup`

export const WORKFLOW_DIR = '.github/workflows'
export const WORKFLOW_FILENAME = 'autodocs.yml'

export const CONFIG_FILENAME = 'autodocs.config.json'
