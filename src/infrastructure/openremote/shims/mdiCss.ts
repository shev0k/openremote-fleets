import mdiCss from "@mdi/font/css/materialdesignicons.min.css?inline";

// OpenRemote's or-icon package expects the CSS module to default-export its stylesheet text.
// Vite serves CSS as a side-effect import by default, so we bridge it here with ?inline.
export default mdiCss;
