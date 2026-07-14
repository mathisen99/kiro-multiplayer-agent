type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

type TextareaLike = {
  value: string;
  style: { cssText: string };
  setAttribute: (name: string, value: string) => void;
  focus: () => void;
  select: () => void;
  setSelectionRange: (start: number, end: number) => void;
  remove: () => void;
};

type ClipboardDocument = {
  body: { appendChild: (element: TextareaLike) => unknown };
  createElement: (tagName: "textarea") => TextareaLike;
  execCommand: (command: "copy") => boolean;
};

export type ClipboardEnvironment = {
  clipboard?: ClipboardLike;
  document?: ClipboardDocument;
};

function browserEnvironment(): ClipboardEnvironment {
  const documentValue = globalThis.document;
  return {
    clipboard: globalThis.navigator?.clipboard,
    document: documentValue
      ? {
          body: {
            appendChild: (element) =>
              documentValue.body.appendChild(element as HTMLTextAreaElement),
          },
          createElement: () => documentValue.createElement("textarea"),
          execCommand: (command) => documentValue.execCommand(command),
        }
      : undefined,
  };
}

export async function copyText(
  text: string,
  environment: ClipboardEnvironment = browserEnvironment(),
): Promise<boolean> {
  if (environment.clipboard) {
    try {
      await environment.clipboard.writeText(text);
      return true;
    } catch {
      // Plain-HTTP and permission-restricted browsers can reject the modern API.
    }
  }

  const documentValue = environment.document;
  if (!documentValue) return false;

  const textarea = documentValue.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  documentValue.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return documentValue.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
