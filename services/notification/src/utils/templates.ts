export const renderTemplate = (
    htmlTemplate: string,
    variables: Record<string, string | number | boolean | null | undefined>
): string => {
    let rendered = htmlTemplate;
    for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replaceAll(`{{${key}}}`, String(value ?? ""));
    }
    return rendered;
};
