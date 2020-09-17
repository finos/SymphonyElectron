// This file is created and modified from the visual form designer in Visual Studio, so shouldn't need to be modified by hand
namespace Symphony
{
    partial class CloseDlg
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.bottomPanel = new System.Windows.Forms.Panel();
            this.tableLayoutbackgroundPanel = new System.Windows.Forms.TableLayoutPanel();
            this.back = new System.Windows.Forms.Button();
            this.next = new System.Windows.Forms.Button();
            this.cancel = new System.Windows.Forms.Button();
            this.backgroundPanel = new System.Windows.Forms.Panel();
            this.labelBody = new System.Windows.Forms.Label();
            this.labelHeader = new System.Windows.Forms.Label();
            this.closeButton = new System.Windows.Forms.Button();
            this.bottomPanel.SuspendLayout();
            this.tableLayoutbackgroundPanel.SuspendLayout();
            this.backgroundPanel.SuspendLayout();
            this.SuspendLayout();
            //
            // bottomPanel
            //
            this.bottomPanel.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)
            | System.Windows.Forms.AnchorStyles.Right)));
            this.bottomPanel.BackColor = System.Drawing.SystemColors.Control;
            this.bottomPanel.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.bottomPanel.Controls.Add(this.tableLayoutbackgroundPanel);
            this.bottomPanel.Location = new System.Drawing.Point(-3, 308);
            this.bottomPanel.Name = "bottomPanel";
            this.bottomPanel.Size = new System.Drawing.Size(503, 57);
            this.bottomPanel.TabIndex = 9;
            //
            // tableLayoutbackgroundPanel
            //
            this.tableLayoutbackgroundPanel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Left | System.Windows.Forms.AnchorStyles.Right)));
            this.tableLayoutbackgroundPanel.ColumnCount = 5;
            this.tableLayoutbackgroundPanel.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutbackgroundPanel.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle());
            this.tableLayoutbackgroundPanel.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle());
            this.tableLayoutbackgroundPanel.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Absolute, 14F));
            this.tableLayoutbackgroundPanel.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle());
            this.tableLayoutbackgroundPanel.Controls.Add(this.back, 1, 0);
            this.tableLayoutbackgroundPanel.Controls.Add(this.next, 2, 0);
            this.tableLayoutbackgroundPanel.Controls.Add(this.cancel, 4, 0);
            this.tableLayoutbackgroundPanel.Location = new System.Drawing.Point(0, 3);
            this.tableLayoutbackgroundPanel.Name = "tableLayoutbackgroundPanel";
            this.tableLayoutbackgroundPanel.RowCount = 1;
            this.tableLayoutbackgroundPanel.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutbackgroundPanel.Size = new System.Drawing.Size(491, 43);
            this.tableLayoutbackgroundPanel.TabIndex = 7;
            //
            // back
            //
            this.back.Anchor = System.Windows.Forms.AnchorStyles.Right;
            this.back.AutoSize = true;
            this.back.Location = new System.Drawing.Point(208, 10);
            this.back.MinimumSize = new System.Drawing.Size(75, 0);
            this.back.Name = "back";
            this.back.Size = new System.Drawing.Size(77, 23);
            this.back.TabIndex = 0;
            this.back.Text = "[WixUIBack]";
            this.back.UseVisualStyleBackColor = true;
            this.back.Click += new System.EventHandler(this.back_Click);
            //
            // next
            //
            this.next.Anchor = System.Windows.Forms.AnchorStyles.Right;
            this.next.AutoSize = true;
            this.next.Location = new System.Drawing.Point(305, 10);
            this.next.MinimumSize = new System.Drawing.Size(75, 0);
            this.next.Name = "next";
            this.next.Size = new System.Drawing.Size(77, 23);
            this.next.TabIndex = 0;
            this.next.Text = "[WixUINext]";
            this.next.UseVisualStyleBackColor = true;
            this.next.Click += new System.EventHandler(this.next_Click);
            //
            // cancel
            //
            this.cancel.Anchor = System.Windows.Forms.AnchorStyles.Right;
            this.cancel.AutoSize = true;
            this.cancel.Location = new System.Drawing.Point(402, 10);
            this.cancel.MinimumSize = new System.Drawing.Size(75, 0);
            this.cancel.Name = "cancel";
            this.cancel.Size = new System.Drawing.Size(86, 23);
            this.cancel.TabIndex = 0;
            this.cancel.Text = "[WixUICancel]";
            this.cancel.UseVisualStyleBackColor = true;
            this.cancel.Click += new System.EventHandler(this.cancel_Click);
            //
            // backgroundPanel
            //
            this.backgroundPanel.BackColor = System.Drawing.Color.White;
            this.backgroundPanel.BackgroundImageLayout = System.Windows.Forms.ImageLayout.None;
            this.backgroundPanel.Controls.Add(this.closeButton);
            this.backgroundPanel.Controls.Add(this.labelBody);
            this.backgroundPanel.Controls.Add(this.labelHeader);
            this.backgroundPanel.Location = new System.Drawing.Point(-3, -1);
            this.backgroundPanel.Name = "backgroundPanel";
            this.backgroundPanel.Size = new System.Drawing.Size(502, 309);
            this.backgroundPanel.TabIndex = 10;
            //
            // labelBody
            //
            this.labelBody.AutoSize = true;
            this.labelBody.Location = new System.Drawing.Point(188, 91);
            this.labelBody.Name = "labelBody";
            this.labelBody.Size = new System.Drawing.Size(294, 52);
            this.labelBody.TabIndex = 1;
            this.labelBody.Text = "It looks like an instance of Symphony is running. You\'ll need\r\nto close that befo" +
    "re continuing with the installation. Please\r\nclick the below \"Close Symphony\" bu" +
    "tton to close Symphony\r\nand continue.";
            //
            // labelHeader
            //
            this.labelHeader.AutoSize = true;
            this.labelHeader.Font = new System.Drawing.Font("Verdana", 12.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.labelHeader.Location = new System.Drawing.Point(187, 20);
            this.labelHeader.MaximumSize = new System.Drawing.Size(500, 0);
            this.labelHeader.Name = "labelHeader";
            this.labelHeader.Size = new System.Drawing.Size(166, 20);
            this.labelHeader.TabIndex = 0;
            this.labelHeader.Text = "Close Symphony";
            //
            // closeButton
            //
            this.closeButton.Location = new System.Drawing.Point(191, 184);
            this.closeButton.Name = "closeButton";
            this.closeButton.Size = new System.Drawing.Size(106, 33);
            this.closeButton.TabIndex = 2;
            this.closeButton.Text = "Close Symphony";
            this.closeButton.UseVisualStyleBackColor = true;
            this.closeButton.Click += new System.EventHandler(this.closeButton_Click);
            //
            // CloseDlg
            //
            this.ClientSize = new System.Drawing.Size(494, 361);
            this.Controls.Add(this.backgroundPanel);
            this.Controls.Add(this.bottomPanel);
            this.Name = "CloseDlg";
            this.Text = "Symphony Setup";
            this.Load += new System.EventHandler(this.dialog_Load);
            this.bottomPanel.ResumeLayout(false);
            this.tableLayoutbackgroundPanel.ResumeLayout(false);
            this.tableLayoutbackgroundPanel.PerformLayout();
            this.backgroundPanel.ResumeLayout(false);
            this.backgroundPanel.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion
        private System.Windows.Forms.Panel bottomPanel;
        private System.Windows.Forms.TableLayoutPanel tableLayoutbackgroundPanel;
        private System.Windows.Forms.Button back;
        private System.Windows.Forms.Button next;
        private System.Windows.Forms.Button cancel;
        private System.Windows.Forms.Panel backgroundPanel;
        private System.Windows.Forms.Label labelHeader;
        private System.Windows.Forms.Label labelBody;
        private System.Windows.Forms.Button closeButton;
    }
}