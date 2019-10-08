function copy() {
    let textarea = document.getElementById("text");
    textarea.select();
    document.execCommand("copy");
}

function pasteText() {
    navigator.clipboard.readText().then(clipText => {
        $("#url").val(clipText);
    });
}