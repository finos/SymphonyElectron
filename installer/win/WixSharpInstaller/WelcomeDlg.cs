using WixSharp;
using System.Drawing;

namespace Symphony
{
    public partial class WelcomeDlg : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        // Helper function to retrive the user name of the current user. The user name returned from
        // windows can be on the form DOMAIN\USER or USER@DOMAIN. This function strips away the domain
        // name and separator, and returns the undecorated user name only.
        private string getUserName()
        {
            var name = System.Security.Principal.WindowsIdentity.GetCurrent().Name;
            var slashIndex = name.IndexOf("\\");
            return slashIndex > -1 ? name.Substring(slashIndex + 1) : name.Substring(0, name.IndexOf("@"));
        }

        public WelcomeDlg()
        {
            InitializeComponent();
        }

        void dialog_Load(object sender, System.EventArgs e)
        {
            // Populate the dynamic UI elements that can't be set at compile time (background image and
            // the label containing user name)
            this.backgroundPanel.BackgroundImage = Runtime.Session.GetResourceBitmap("WixUI_Bmp_Dialog");
            this.radioButtonCurrentUser.Text = "Only for me (" + getUserName() + ")";
            if( Runtime.Session["ALLUSERS"] != "" )
            {
                    this.radioButtonAllUsers.Checked = true;
            }
            else
            {
                   this.radioButtonCurrentUser.Checked = true;
            }
        }

        void next_Click(object sender, System.EventArgs e)
        {
            // To enable Wix to use the "MSIINSTALLPERUSER" property being set below, ALLUSERS must be set to 2
            Runtime.Session["ALLUSERS"] = "2";


            if (radioButtonCurrentUser.Checked)
            {
                // Install for current user
                Runtime.Session["MSIINSTALLPERUSER"] = "1"; // per-user
                Runtime.Session["INSTALLDIR"] = System.Environment.ExpandEnvironmentVariables(@"%LOCALAPPDATA%\Apps\Symphony\" + Runtime.ProductName);
            } else if (radioButtonAllUsers.Checked)
            {
                // Install for all users
                Runtime.Session["MSIINSTALLPERUSER"] = ""; // per-machine
                Runtime.Session["INSTALLDIR"] = Runtime.Session["PROGRAMSFOLDER"]  + @"\Symphony\" + Runtime.ProductName;
            }

            Shell.GoNext();
        }

        void cancel_Click(object sender, System.EventArgs e)
        {
            Shell.Cancel();
        }
    }
}