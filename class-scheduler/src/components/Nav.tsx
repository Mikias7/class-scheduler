import logo from '/auLogo.png';


function Nav() {
  return (
    <nav className="w-full bg-[#001F3F] text-white flex items-center justify-between px-6 py-3 shadow-md">
      
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="logo" className="h-12 w-auto" />
        <h1 className="text-xl font-semibold text-[#FFD700]">Academic Planner</h1>
      </div>
      
    </nav>
  );
}

export default Nav;