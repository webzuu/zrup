### Autodependencies and autotargets

1) Early autodependencies for rule R:

    - auxiliary rule D is created that takes the same static dependencies as the main rule and outputs an artifact list DL containing autodependencies
    - DL is added as a static dependency to jobs created form R

2) Late autodependencies for rule R:

    - rule R's build job records autodependencies in the database
    - previously recorded dependencies that are not static dependencies of R are added as dynamic dependencies to jobs created from R
    - this works under the assumption that the set of autodependencies can change only if static dependencies are modified
    - if this assumption doesn't hold, it is advisable that rule R depend on tree fingerprint of a Conservative Dependency Set (CDS) including all possible autodependencies
    - additionally, if rule V can affect rule R's CDS, then rule R must processed after rule V
    - also consider hoisting early autodependencies to treat them like static dependencies

3) Early autotargets for rule R:

    - if autotargets of rule R can affect a CDS of rule V, then rule V must be processed after rule R
    - for now, we will rely on manual hinting with `after` and hope for the best
    - then we will add ability to detect incorrect builds as they happen:
        - record dependency states relied upon, i.e. snapshotted right before running a rule's up-to-dateness check
        - after build, re-verify that their states didn't change since they were depended upon
    - finally, we will try to automanage this by running rules with autotargets before rules with autodependencies as much as the static graph allows
    - also consider hoisting early autotarget listing

4) Late autotargets for rule R:

    - as in 3), except hoisting won't be possible
   
### `also` edges

Artifacts nominated with the `also` nominator will have their build jobs enqueued for building in parallel with the build job for the current rule, and they will be awaited together. The order in which they will build in relation to the build job for the current rule will be determined by regular `depends` edges in the graph. At a higher level, autodependencies and autotargets can be implemented in such a way that processing the generated filelists into DB records will wait until the build job for the current rule is completed, but generating the filelists themselves may be done beforehand or in parallel.

### Artifact aliasing

When an artifact is added to rule:
- we check if its AID is most module-specific
- if it is not, we:
  - issue a warning
  - normalize to most-specific
  - after normalization, we deduplicate it via `ArtifactManager`

When an artifact is retrieved from db, we do the exact same thing.

Artifacts referred to by multiple aliases will usually indicate unfinished refactoring of the build spec. Warnings will be in place to inform about this. 

### Loading the project
- all modules must exist before any artifacts are created, because AIDs are module-relative
- therefore any creation of artifacts must occur inside callbacks that will be executed only after all modules have been created

We extensively use a pattern similar to `new Promise((resolve, reject) => { work(); })`. A zrup module default-exports a function that actually defines the module, and that function receives tools with which it can do its work. It's the same for rules.

### Example module

```javascript

import zrup from "zrup";
import {ObeyTask} from "zuu-tasks";

async function myModule({module, include, rule}) {

    //include some submodules
   await include("some/subpath", "other/subpath");
    
   // Takes module and subdirectory containing Obeyfile.php 
   const nginx_config = new ObeyTask(module, "obey/config");
   
   //If ObeyTask has basic implementation
   rule("nginx-config", async ({depends, produces, after}) => {
      const artifacts = await nginx_config.artifacts();
      depends(artifacts.inputs);
      produces(artifacts.outputs);
      return nginx_config.recipe;
   });

   //If ObeyTask implements the above for our convenience
   nginx_config.zrup(rule, "nginx-config", ({depends}) => {
       depends("some.json","extra.yml","deps.cfg");
   });
}

//variant 1, uses the name property of the returned function
export default myModule;

//variant 2, explicit
export default zrup.describeModule("my-fancy-module-name", myModule);

//variant 3, middle ground
myModule.moduleName = "my-fancy-module-name"
export default myModule;
```

### Ideas
- Store reference to requesting job in Job instance. This creates a chain of jobs that can be useful for debugging.
