using WixSharp;

namespace Symphony
{
    public partial class MaintenanceDialog : WixSharp.UI.Forms.ManagedForm, IManagedDialog
    {
        public MaintenanceDialog()
        {
            InitializeComponent();
        }

        private void MaintenanceDialog_Shown(object sender, System.EventArgs e)
        {
            // Detect if Symphony is running
            bool isRunning = System.Diagnostics.Process.GetProcessesByName("Symphony").Length > 1;
            if (isRunning)
            {
                // If it is running, continue to the "Close Symphony" screen
                Shell.GoNext();
            }
            else
            {
                // If it is not running, proceed to progress dialog
                Shell.GoTo<Symphony.ProgressDialog>();
            }
        }

    }
}