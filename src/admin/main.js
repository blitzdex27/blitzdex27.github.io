import { mount } from "svelte";
import App from "./App.svelte";
import "./admin.css";

mount(App, {
  target: document.getElementById("admin-app"),
});
