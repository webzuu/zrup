### Desired features (in no particular order)

  - artifact aliases (`zrup indigo` instead of `zrup internal:ecs+indigo`)
  - make `resolve()` more avoidable (last resort when `depends()`, `produces()` or AID string cannot be used)
  - delete disowned autotargets but keep disowned/ejected targets (automatically scheduled cleanup pass?)
  - refer to module by path instead of name; absolute from root module's dir or relative from current module

### Ideas
  - Store reference to requesting job in Job instance. This creates a chain of jobs that can be useful for debugging.
