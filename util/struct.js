import './nstructjs.js';

export let nstructjs = window.nstructjs;

export default Object.assign({
  setEndian(mode) {
    nstructjs.STRUCT_ENDIAN = mode;
  }
}, nstructjs);

/*now that we have nstructjs in module form,
* delete the window global so all usages of
* nstructjs properly import it.  Needed
* for minification */

delete window.nstructjs;
