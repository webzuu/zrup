export default async function
root({include}) {
    await include('submodule');
}
