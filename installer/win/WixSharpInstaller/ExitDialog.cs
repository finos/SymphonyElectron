using WixSharp;

namespace Symphony
{
    public partial class ExitDialog : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        public ExitDialog()
        {
            InitializeComponent();
        }

        private void ExitDialog_Load(object sender, System.EventArgs e)
        {
            // Exit installation on completion (don't wait for user to confirm)
            // After installation exits, the app will be auto launched, but that is specified in Symphony.cs
            Shell.Exit();
        }

    }
}