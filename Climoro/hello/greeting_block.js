// 'root_element' is provided by Frappe for Custom HTML Blocks
let full_name = frappe.user.full_name();
if (!full_name || !full_name.trim()) {
  full_name = frappe.session.user;
}
const first_name = full_name.split(" ")[0] || "Guest";
const name_el = root_element.querySelector(".user-first-name");
if (name_el) {
  name_el.textContent = first_name;
}