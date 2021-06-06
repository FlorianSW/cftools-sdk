export function asDate(dateAsString: string): Date {
    if (dateAsString.indexOf('+') !== -1 || dateAsString.endsWith('Z')) {
        return new Date(dateAsString)
    }
    return new Date(dateAsString + 'Z')
}
