import logo from "../assets/logo.png";
export function NavBar() {
  return (
    <nav className="fixed top-0 w-full h-16 px-8 flex flex-row items-center justify-start z-50 shadow bg-white">
      <div className="flex flex-row items-center justify-start">
        <img className="h-12 w-12 mr-2 mobile:hidden" src={logo} alt="Logo" />
        <h1 className="text-2xl font-bold mr-16 ">DSensei</h1>
      </div>
      <a href="/">New Report</a>
    </nav>
  );
}
