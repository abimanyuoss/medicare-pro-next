import {
  BookOpen,
  FileSpreadsheet,
  Landmark,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  AccountType,
  FinancialActivityType,
  NormalBalance,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  accountTypeLabel,
  activityTypeLabel,
  activityTypeOptions,
  ensureDefaultAccounts,
  normalBalanceLabel,
} from "@/lib/accounting-db";
import {
  createAccount,
  createFinancialActivity,
  deleteAccount,
  deleteFinancialActivity,
  seedDefaultAccounts,
  updateAccount,
  updateFinancialActivity,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const accountTypeOptions = [
  AccountType.ASET,
  AccountType.KEWAJIBAN,
  AccountType.EKUITAS,
  AccountType.PENDAPATAN,
  AccountType.BEBAN,
];

const normalBalanceOptions = [NormalBalance.DEBIT, NormalBalance.KREDIT];

export default async function AkuntansiPage() {
  const accountCount = await prisma.account.count();
  if (accountCount === 0) {
    await ensureDefaultAccounts();
  }

  const [accounts, activities, journalEntries] = await Promise.all([
    prisma.account.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
    }),
    prisma.financialActivity.findMany({
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.journalEntry.findMany({
      orderBy: [{ date: "desc" }, { code: "desc" }],
      take: 30,
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    }),
  ]);

  const totalDebit = journalEntries.reduce(
    (sum, entry) =>
      sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit), 0),
    0
  );
  const totalCredit = journalEntries.reduce(
    (sum, entry) =>
      sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit), 0),
    0
  );

  return (
    <div className="fade-in space-y-6">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Landmark size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Daftar Akun</p>
              <p className="text-2xl font-extrabold text-slate-900">{accounts.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Debet Jurnal</p>
              <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(totalDebit)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Kredit Jurnal</p>
              <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(totalCredit)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-slate-900">Tambah Akun</h3>
              <form action={seedDefaultAccounts}>
                <SubmitButton
                  pendingText="Mengisi..."
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-200"
                >
                  <RefreshCw size={14} />
                  Akun Standar
                </SubmitButton>
              </form>
            </div>

            <form action={createAccount} className="mt-5 space-y-3" data-reset-on-flash="true">
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="code"
                  required
                  placeholder="Kode"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <select
                  name="type"
                  required
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {accountTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {accountTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <input
                name="name"
                required
                placeholder="Nama akun"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="normalBalance"
                  required
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {normalBalanceOptions.map((balance) => (
                    <option key={balance} value={balance}>
                      {normalBalanceLabel(balance)}
                    </option>
                  ))}
                </select>
                <input
                  name="statement"
                  required
                  placeholder="Laporan"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <SubmitButton className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
                <Plus size={17} />
                Simpan Akun
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900">Aktivitas Keuangan</h3>

            <form
              action={createFinancialActivity}
              className="mt-5 space-y-3"
              data-reset-on-flash="true"
            >
              <select
                name="type"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {activityTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                name="date"
                type="date"
                required
                defaultValue={dateInputValue(new Date())}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <input
                name="description"
                required
                placeholder="Keterangan"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <input
                name="amount"
                type="number"
                min={1}
                required
                placeholder="Jumlah"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <SubmitButton className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700">
                <Plus size={17} />
                Simpan Aktivitas
              </SubmitButton>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h3 className="text-lg font-extrabold text-slate-900">
                Daftar Akun (Chart of Accounts)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Kode</th>
                    <th className="px-5 py-3">Nama Akun</th>
                    <th className="px-5 py-3">Kelompok</th>
                    <th className="px-5 py-3">Saldo Normal</th>
                    <th className="px-5 py-3">Laporan</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-5 py-4 font-extrabold text-slate-900">{account.code}</td>
                      <td className="px-5 py-4">{account.name}</td>
                      <td className="px-5 py-4">{accountTypeLabel(account.type)}</td>
                      <td className="px-5 py-4">{normalBalanceLabel(account.normalBalance)}</td>
                      <td className="px-5 py-4">{account.statement}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <details className="relative">
                            <summary className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700">
                              Edit
                            </summary>
                            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                              <form action={updateAccount} className="space-y-2">
                                <input type="hidden" name="id" value={account.id} />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    name="code"
                                    required
                                    defaultValue={account.code}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                  />
                                  <select
                                    name="type"
                                    required
                                    defaultValue={account.type}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                  >
                                    {accountTypeOptions.map((type) => (
                                      <option key={type} value={type}>
                                        {accountTypeLabel(type)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  name="name"
                                  required
                                  defaultValue={account.name}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    name="normalBalance"
                                    required
                                    defaultValue={account.normalBalance}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                  >
                                    {normalBalanceOptions.map((balance) => (
                                      <option key={balance} value={balance}>
                                        {normalBalanceLabel(balance)}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    name="statement"
                                    required
                                    defaultValue={account.statement}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                  />
                                </div>
                                <SubmitButton className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white">
                                  Simpan Perubahan
                                </SubmitButton>
                              </form>
                            </div>
                          </details>
                          <form action={deleteAccount}>
                            <input type="hidden" name="id" value={account.id} />
                            <SubmitButton
                              pendingText="..."
                              className="inline-flex items-center rounded-xl bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={15} />
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h3 className="text-lg font-extrabold text-slate-900">Riwayat Aktivitas Keuangan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Kode</th>
                    <th className="px-5 py-3">Aktivitas</th>
                    <th className="px-5 py-3 text-right">Jumlah</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-5 py-4">{formatDate(activity.date)}</td>
                      <td className="px-5 py-4 font-extrabold text-slate-900">{activity.code}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {activityTypeLabel(activity.type)}
                        </p>
                        <p className="text-xs text-slate-500">{activity.description}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold">
                        {formatRupiah(activity.amount.toString())}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <details className="relative">
                            <summary className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700">
                              Edit
                            </summary>
                            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                              <form action={updateFinancialActivity} className="space-y-2">
                                <input type="hidden" name="id" value={activity.id} />
                                <select
                                  name="type"
                                  required
                                  defaultValue={activity.type}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                  {activityTypeOptions().map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="date"
                                  type="date"
                                  required
                                  defaultValue={dateInputValue(activity.date)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <input
                                  name="description"
                                  required
                                  defaultValue={activity.description}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <input
                                  name="amount"
                                  type="number"
                                  min={1}
                                  required
                                  defaultValue={activity.amount.toString()}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                                <SubmitButton className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white">
                                  Simpan Perubahan
                                </SubmitButton>
                              </form>
                            </div>
                          </details>
                          <form action={deleteFinancialActivity}>
                            <input type="hidden" name="id" value={activity.id} />
                            <SubmitButton
                              pendingText="..."
                              className="inline-flex items-center rounded-xl bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={15} />
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                        Belum ada aktivitas keuangan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h3 className="text-lg font-extrabold text-slate-900">Jurnal Umum Otomatis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">No Bukti</th>
                <th className="px-5 py-3">Keterangan</th>
                <th className="px-5 py-3">Kode Akun</th>
                <th className="px-5 py-3">Nama Akun</th>
                <th className="px-5 py-3 text-right">Debet</th>
                <th className="px-5 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journalEntries.flatMap((entry) =>
                entry.lines.map((line, index) => (
                  <tr key={line.id}>
                    <td className="px-5 py-4">{index === 0 ? formatDate(entry.date) : ""}</td>
                    <td className="px-5 py-4 font-bold">{index === 0 ? entry.code : ""}</td>
                    <td className="px-5 py-4">{index === 0 ? entry.description : ""}</td>
                    <td className="px-5 py-4 font-extrabold text-slate-900">{line.account.code}</td>
                    <td className="px-5 py-4">{line.account.name}</td>
                    <td className="px-5 py-4 text-right font-bold">
                      {Number(line.debit) > 0 ? formatRupiah(line.debit.toString()) : "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-bold">
                      {Number(line.credit) > 0 ? formatRupiah(line.credit.toString()) : "-"}
                    </td>
                  </tr>
                ))
              )}
              {journalEntries.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                    Jurnal akan muncul setelah transaksi atau aktivitas keuangan disimpan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
