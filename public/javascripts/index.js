function copy() {
    let textarea = document.getElementById("text");
    textarea.select();
    document.execCommand("copy");
}